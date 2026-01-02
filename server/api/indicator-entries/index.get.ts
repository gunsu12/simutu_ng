import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, units } from '../../database/schema'
import { eq, isNull, desc, and, gte, lte, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    // Parse query parameters for filtering
    const query = getQuery(event)
    
    // Default to today for date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Parse date range parameters
    const startDateParam = query.startDate as string | undefined
    const endDateParam = query.endDate as string | undefined
    
    const startDate = startDateParam ? new Date(startDateParam) : today
    const endDate = endDateParam ? new Date(endDateParam) : tomorrow
    
    // Parse frequency and status filters
    const frequency = query.entryFrequency as string | undefined
    const status = query.status as string | undefined
    const statuses = status ? status.split(',').map(s => s.trim()) : undefined

    // Build where conditions
    const conditions = [isNull(indicatorEntries.deletedAt)]
    
    // Add date range filter
    conditions.push(gte(indicatorEntries.entryDate, startDate))
    conditions.push(lte(indicatorEntries.entryDate, endDate))
    
    // Add frequency filter if provided
    if (frequency && ['daily', 'monthly'].includes(frequency)) {
      conditions.push(eq(indicatorEntries.entryFrequency, frequency as any))
    }
    
    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      const validStatuses = statuses.filter(s => ['proposed', 'checked', 'pending', 'finish'].includes(s))
      if (validStatuses.length > 0) {
        conditions.push(inArray(indicatorEntries.status, validStatuses as any))
      }
    }

    // Build and execute query
    const dbQuery = db
      .select({
        entry: indicatorEntries,
        unit: units,
      })
      .from(indicatorEntries)
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .where(and(...conditions))
      .orderBy(desc(indicatorEntries.createdAt))

    const entries = await dbQuery

    // Fetch items for each entry
    const entriesWithItems = await Promise.all(
      entries.map(async ({ entry, unit }) => {
        const items = await db
          .select({
            item: indicatorEntryItems,
            indicator: indicators,
          })
          .from(indicatorEntryItems)
          .leftJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
          .where(eq(indicatorEntryItems.indicatorEntryId, entry.id))

        return {
          ...entry,
          unit,
          items: items.map(({ item, indicator }) => ({
            ...item,
            indicator,
          })),
        }
      })
    )

    return {
      success: true,
      data: entriesWithItems,
    }
  } catch (error: any) {
    console.error('Fetch indicator entries error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator entries',
    }
  }
})
