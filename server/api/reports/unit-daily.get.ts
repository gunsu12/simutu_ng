import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, units, sites, employees } from '../../database/schema'
import { eq, isNull, and, gte, lte, desc } from 'drizzle-orm'

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
    const date = query.date as string // Format: YYYY-MM-DD

    if (!unitId) {
      throw createError({
        statusCode: 400,
        message: 'Unit ID is required',
      })
    }

    if (!date) {
      throw createError({
        statusCode: 400,
        message: 'Date is required (format: YYYY-MM-DD)',
      })
    }

    // Parse date boundaries for the requested day
    const [year, month, day] = date.split('-').map(Number)
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999)

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

    // Fetch indicator entries for this unit and day (daily frequency)
    const entries = await db
      .select({
        entry: indicatorEntries,
      })
      .from(indicatorEntries)
      .where(
        and(
          eq(indicatorEntries.unitId, unitId),
          eq(indicatorEntries.entryFrequency, 'daily'),
          gte(indicatorEntries.entryDate, startDate),
          lte(indicatorEntries.entryDate, endDate),
          isNull(indicatorEntries.deletedAt)
        )
      )
      .orderBy(desc(indicatorEntries.createdAt))

    const reportItems: any[] = []

    for (const { entry } of entries) {
      const items = await db
        .select({
          item: indicatorEntryItems,
          indicator: indicators,
        })
        .from(indicatorEntryItems)
        .leftJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
        .where(eq(indicatorEntryItems.indicatorEntryId, entry.id))

      for (const { item, indicator } of items) {
        if (!indicator) continue

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

        const target = indicator.target ? Number(indicator.target) : null
        const targetWeight = indicator.targetWeight ? Number(indicator.targetWeight) : 0
        let skor: number | null = null
        let point: number | null = null

        if (capaian !== null && target !== null) {
          const keterangan = indicator.targetKeterangan || '>='
          let achieved = false

          switch (keterangan) {
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

          skor = achieved ? 100 : (capaian / target) * 100
          point = achieved ? targetWeight : 0
        }

        reportItems.push({
          indicatorId: indicator.id,
          code: indicator.code,
          judul: indicator.judul,
          numerator: indicator.numerator,
          denominator: indicator.denominator,
          numeratorValue: numerator,
          denominatorValue: denominator,
          bobot: targetWeight,
          hasil: item.numeratorDenominatorResult ? Number(item.numeratorDenominatorResult) : capaian,
          capaian: capaian,
          standar: target,
          standarUnit: indicator.targetUnit,
          standarKeterangan: indicator.targetKeterangan,
          skor: item.skor ? Number(item.skor) : skor,
          point: point,
          isNeedPDCA: item.isNeedPDCA,
          status: entry.status,
          notes: item.notes,
          entryDate: entry.entryDate,
        })
      }
    }

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    const monthName = monthNames[month - 1]

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
          day: day,
          month: month,
          year: year,
          monthName: monthName,
          formatted: `${day} ${monthName} ${year}`,
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
