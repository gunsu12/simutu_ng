import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, units, sites, employees } from '../../database/schema'
import { eq, isNull, and, gte, lte, desc, sql } from 'drizzle-orm'

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
    const unitId = query.unitId as string
    const startDateQuery = query.startDate as string
    const endDateQuery = query.endDate as string

    if (!unitId) {
      throw createError({
        statusCode: 400,
        message: 'Unit ID is required',
      })
    }

    if (!startDateQuery || !endDateQuery) {
      throw createError({
        statusCode: 400,
        message: 'Start date and end date are required',
      })
    }

    // Parse dates manually to avoid timezone shifts
    const parseDate = (dateStr: string, isEnd: boolean) => {
      const [year, month, day] = dateStr.split('-').map(Number)
      if (isEnd) {
        return new Date(year, month - 1, day, 23, 59, 59, 999)
      }
      return new Date(year, month - 1, day, 0, 0, 0, 0)
    }

    const startDate = parseDate(startDateQuery, false)
    const endDate = parseDate(endDateQuery, true)

    // Fetch unit with site info
    const [unitData] = await db
      .select({
        unit: units,
        site: sites,
        headOfUnit: employees,
      })
      .from(units)
      .leftJoin(sites, eq(units.siteId, sites.id))
      .leftJoin(employees, eq(units.headOfUnit, employees.id))
      .where(eq(units.id, unitId))

    if (!unitData) {
      throw createError({
        statusCode: 404,
        message: 'Unit not found',
      })
    }

    // Fetch and aggregate indicator entries for this unit and period
    // We group by indicatorId and necessary indicator columns
    const aggregatedData = await db
      .select({
        indicatorId: indicatorEntryItems.indicatorId,
        totalNumerator: sql<number>`sum(CAST(${indicatorEntryItems.numeratorValue} AS NUMERIC))`,
        totalDenominator: sql<number>`sum(CAST(${indicatorEntryItems.denominatorValue} AS NUMERIC))`,
        // Select specific indicator columns to avoid GROUP BY issues with all columns
        id: indicators.id,
        code: indicators.code,
        judul: indicators.judul,
        numerator: indicators.numerator,
        denominator: indicators.denominator,
        targetCalculationFormula: indicators.targetCalculationFormula,
        target: indicators.target,
        targetWeight: indicators.targetWeight,
        targetUnit: indicators.targetUnit,
        targetKeterangan: indicators.targetKeterangan,
        avgSkor: sql<number>`avg(CAST(${indicatorEntryItems.skor} AS NUMERIC))`,
      })
      .from(indicatorEntryItems)
      .innerJoin(indicatorEntries, eq(indicatorEntryItems.indicatorEntryId, indicatorEntries.id))
      .innerJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .where(
        and(
          eq(indicatorEntries.unitId, unitId),
          eq(indicatorEntries.entryFrequency, 'daily'),
          gte(indicatorEntries.entryDate, startDate),
          lte(indicatorEntries.entryDate, endDate),
          isNull(indicatorEntries.deletedAt)
        )
      )
      .groupBy(
        indicatorEntryItems.indicatorId,
        indicators.id,
        indicators.code,
        indicators.judul,
        indicators.numerator,
        indicators.denominator,
        indicators.targetCalculationFormula,
        indicators.target,
        indicators.targetWeight,
        indicators.targetUnit,
        indicators.targetKeterangan
      )

    const reportItems: any[] = []

    for (const item of aggregatedData) {
      let capaian: number | null = null
      const numerator = item.totalNumerator !== null ? Number(item.totalNumerator) : 0
      const denominator = item.totalDenominator !== null ? Number(item.totalDenominator) : 0

      // Formula logic based on master data
      const formula = item.targetCalculationFormula || '(N/D)*100'

      if (formula.includes('/D')) {
        if (denominator !== 0) {
          if (formula === 'N/D') {
            capaian = numerator / denominator
          } else {
            // Default to (N/D)*100
            capaian = (numerator / denominator) * 100
          }
        } else {
          capaian = 0
        }
      } else if (formula === 'N-D') {
        capaian = numerator - denominator
      } else if (formula === 'N') {
        capaian = numerator
      }

      const target = item.target ? Number(item.target) : 0
      const targetWeight = item.targetWeight ? Number(item.targetWeight) : 0
      const skor = item.avgSkor !== null ? Number(item.avgSkor) : null
      const point = skor !== null ? skor * targetWeight : null

      reportItems.push({
        indicatorId: item.id,
        code: item.code,
        judul: item.judul,
        numerator: item.numerator,
        denominator: item.denominator,
        numeratorValue: numerator,
        denominatorValue: denominator,
        bobot: targetWeight,
        hasil: capaian, // Results of N/D or N-D
        capaian: capaian,
        standar: target,
        standarUnit: item.targetUnit,
        standarKeterangan: item.targetKeterangan,
        skor: skor,
        point: point,
        isNeedPDCA: (target ?? 0) < 100, // Typically needed if not 100%
        status: 'finish', // For aggregated report, we might just mark as finish if entries exist
      })
    }

    return {
      success: true,
      data: {
        site: {
          id: unitData.site?.id,
          name: unitData.site?.name,
          address: unitData.site?.address,
          logo: unitData.site?.siteLogo,
        },
        unit: {
          id: unitData.unit.id,
          name: unitData.unit.name,
          code: unitData.unit.unitCode,
          headOfUnit: unitData.headOfUnit?.fullName,
        },
        period: {
          startDate: startDateQuery,
          endDate: endDateQuery,
          formatted: startDateQuery === endDateQuery ? startDateQuery : `${startDateQuery} s/d ${endDateQuery}`,
        },
        items: reportItems,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error: any) {
    console.error('Fetch unit daily report error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch unit daily report',
    }
  }
})

