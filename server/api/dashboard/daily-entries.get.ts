import { db } from '../../database'
import { 
  indicatorEntries, 
  indicatorEntryItems, 
  indicators, 
  units,
  employees
} from '../../database/schema'
import { eq, and, isNull, gte, lte, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const query = getQuery(event)
    const unitId = query.unitId as string | undefined
    const limit = parseInt(query.limit as string) || 10

    // Get user's unit if not specified
    let filterUnitId = unitId
    if (!filterUnitId && user.employeeId) {
      const employee = await db
        .select({ unitId: employees.unitId })
        .from(employees)
        .where(eq(employees.id, user.employeeId))
        .limit(1)
      
      if (employee.length > 0 && employee[0].unitId) {
        filterUnitId = employee[0].unitId
      }
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Build conditions for daily entries
    const conditions = [
      isNull(indicatorEntries.deletedAt),
      eq(indicatorEntries.entryFrequency, 'daily'),
      gte(indicatorEntries.entryDate, today),
      lte(indicatorEntries.entryDate, tomorrow)
    ]

    if (filterUnitId) {
      conditions.push(eq(indicatorEntries.unitId, filterUnitId))
    }

    // Fetch daily entries
    const entries = await db
      .select({
        entry: indicatorEntries,
        unit: units,
      })
      .from(indicatorEntries)
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .where(and(...conditions))
      .orderBy(desc(indicatorEntries.createdAt))
      .limit(limit)

    // Fetch items for each entry
    const entriesWithItems = await Promise.all(
      entries.map(async ({ entry, unit }) => {
        const items = await db
          .select({
            item: indicatorEntryItems,
            indicator: {
              id: indicators.id,
              code: indicators.code,
              judul: indicators.judul,
              target: indicators.target,
              targetUnit: indicators.targetUnit,
              targetKeterangan: indicators.targetKeterangan,
            },
          })
          .from(indicatorEntryItems)
          .leftJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
          .where(eq(indicatorEntryItems.indicatorEntryId, entry.id))

        return {
          id: entry.id,
          entryCode: entry.entryCode,
          entryDate: entry.entryDate,
          status: entry.status,
          notes: entry.notes,
          unit: unit ? {
            id: unit.id,
            name: unit.name,
            unitCode: unit.unitCode,
          } : null,
          items: items.map(({ item, indicator }) => ({
            id: item.id,
            numeratorValue: item.numeratorValue,
            denominatorValue: item.denominatorValue,
            skor: item.skor,
            isNeedPDCA: item.isNeedPDCA,
            indicator,
          })),
          itemsCount: items.length,
          completedItems: items.filter(i => i.item.numeratorValue !== null).length,
        }
      })
    )

    return {
      success: true,
      data: entriesWithItems,
    }
  } catch (error: any) {
    console.error('Daily entries error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch daily entries',
    }
  }
})
