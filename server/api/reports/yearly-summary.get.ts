import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, indicatorCategories, indicatorUnits, units } from '../../database/schema'
import { eq, isNull, and, gte, lte, sql, inArray } from 'drizzle-orm'

interface MonthlyResult {
  month: number
  capaian: number | null
  achieved: boolean
}

interface ReportRow {
  no: number
  indicatorId: string
  code: string
  judul: string
  unitId: string
  unitName: string
  target: number | null
  targetKeterangan: string | null
  targetUnit: string | null
  monthlyResults: MonthlyResult[]
}

interface UnitGroup {
  unitId: string
  unitName: string
  indicators: ReportRow[]
  notAchievedCount: number[]
}

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const query = getQuery(event)
    const year = parseInt(query.year as string) || new Date().getFullYear()
    const categoryId = query.categoryId as string | undefined
    const entryFrequency = (query.frequency as string) || 'monthly'

    // Build date range for the year
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0)
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

    // Fetch indicator categories for filtering
    const categoriesData = await db
      .select()
      .from(indicatorCategories)
      .where(isNull(indicatorCategories.deletedAt))

    // Build indicator filter conditions
    const indicatorConditions = [
      isNull(indicators.deletedAt),
      eq(indicators.isActive, true),
      eq(indicators.entryFrequency, entryFrequency),
    ]
    
    if (categoryId) {
      indicatorConditions.push(eq(indicators.indicatorCategoryId, categoryId))
    }

    // Get all active indicators with their units
    const indicatorsWithUnits = await db
      .select({
        indicator: indicators,
        unitId: indicatorUnits.unitId,
        unitName: units.name,
      })
      .from(indicators)
      .innerJoin(indicatorUnits, eq(indicators.id, indicatorUnits.indicatorId))
      .innerJoin(units, eq(indicatorUnits.unitId, units.id))
      .where(and(...indicatorConditions))

    if (indicatorsWithUnits.length === 0) {
      return {
        success: true,
        data: {
          year,
          frequency: entryFrequency,
          categories: categoriesData,
          unitGroups: [],
          generatedAt: new Date().toISOString(),
        },
      }
    }

    // Fetch all indicator entries for the year
    const entries = await db
      .select({
        entry: indicatorEntries,
        item: indicatorEntryItems,
        indicator: indicators,
      })
      .from(indicatorEntries)
      .innerJoin(indicatorEntryItems, eq(indicatorEntries.id, indicatorEntryItems.indicatorEntryId))
      .innerJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .where(
        and(
          eq(indicatorEntries.entryFrequency, entryFrequency),
          gte(indicatorEntries.entryDate, startDate),
          lte(indicatorEntries.entryDate, endDate),
          isNull(indicatorEntries.deletedAt)
        )
      )

    // Build a map for quick lookup: indicatorId + unitId + month -> result
    const resultsMap = new Map<string, { numerator: number | null; denominator: number | null; capaian: number | null }>()
    
    for (const { entry, item, indicator } of entries) {
      const month = new Date(entry.entryDate).getMonth() + 1
      const key = `${indicator.id}_${entry.unitId}_${month}`
      
      // Calculate capaian
      let capaian: number | null = null
      const numerator = item.numeratorValue ? Number(item.numeratorValue) : null
      const denominator = item.denominatorValue ? Number(item.denominatorValue) : null
      
      if (numerator !== null && denominator !== null && denominator !== 0) {
        const formula = indicator.targetCalculationFormula || '(N/D)*100'
        switch (formula) {
          case 'N/D':
            capaian = numerator / denominator
            break
          case 'N-D':
            capaian = numerator - denominator
            break
          case '(N/D)*100':
          default:
            capaian = (numerator / denominator) * 100
            break
        }
      }
      
      // Use the calculated result or stored result
      const finalCapaian = item.numeratorDenominatorResult 
        ? Number(item.numeratorDenominatorResult) 
        : capaian

      resultsMap.set(key, {
        numerator,
        denominator,
        capaian: finalCapaian,
      })
    }

    // Group indicators by unit
    const unitGroupsMap = new Map<string, UnitGroup>()
    let globalNo = 0

    for (const { indicator, unitId, unitName } of indicatorsWithUnits) {
      if (!unitGroupsMap.has(unitId)) {
        unitGroupsMap.set(unitId, {
          unitId,
          unitName,
          indicators: [],
          notAchievedCount: Array(12).fill(0),
        })
      }

      const unitGroup = unitGroupsMap.get(unitId)!
      globalNo++

      // Build monthly results for this indicator in this unit
      const monthlyResults: MonthlyResult[] = []
      const target = indicator.target ? Number(indicator.target) : null
      const targetKeterangan = indicator.targetKeterangan || '>='

      for (let month = 1; month <= 12; month++) {
        const key = `${indicator.id}_${unitId}_${month}`
        const result = resultsMap.get(key)
        
        let capaian: number | null = result?.capaian ?? null
        let achieved = false

        if (capaian !== null && target !== null) {
          switch (targetKeterangan) {
            case '>':
              achieved = capaian > target
              break
            case '<':
              achieved = capaian < target
              break
            case '=':
              achieved = capaian === target
              break
            case '>=':
              achieved = capaian >= target
              break
            case '<=':
              achieved = capaian <= target
              break
          }
          
          if (!achieved) {
            unitGroup.notAchievedCount[month - 1]++
          }
        }

        monthlyResults.push({
          month,
          capaian,
          achieved,
        })
      }

      unitGroup.indicators.push({
        no: globalNo,
        indicatorId: indicator.id,
        code: indicator.code,
        judul: indicator.judul,
        unitId,
        unitName,
        target,
        targetKeterangan: indicator.targetKeterangan,
        targetUnit: indicator.targetUnit,
        monthlyResults,
      })
    }

    // Convert map to array and sort by unit name
    const unitGroups = Array.from(unitGroupsMap.values())
      .sort((a, b) => a.unitName.localeCompare(b.unitName))

    return {
      success: true,
      data: {
        year,
        frequency: entryFrequency,
        categories: categoriesData,
        unitGroups,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error: any) {
    console.error('Fetch yearly report error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch yearly report',
    }
  }
})
