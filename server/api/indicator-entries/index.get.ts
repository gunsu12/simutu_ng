import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, units } from '../../database/schema'
import { eq, isNull, desc, and, gte, lte, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    const user = event.context.user
    if (!session || !user) {
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

    // Set time to end of day for endDate if it comes from a parameter
    if (endDateParam) {
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Default tomorrow already covers full current day
    }

    startDate.setHours(0, 0, 0, 0)

    // Parse frequency and status filters
    const frequency = query.entryFrequency as string | undefined
    const status = query.status as string | undefined
    const statuses = status ? status.split(',').map(s => s.trim()) : undefined
    const unitId = query.unitId as string | undefined

    // Role-based visibility logic
    const unitConditions = [isNull(units.deletedAt)]
    let allowedUnitIds: string[] | null = null

    if (user.role === 'user' && user.unitId) {
      allowedUnitIds = [user.unitId]
    } else if (user.role === 'manager' && user.employeeId) {
      const managedUnits = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.headOfUnit, user.employeeId), isNull(units.deletedAt)))
      allowedUnitIds = managedUnits.map(u => u.id)
    } else if (user.role === 'auditor' && user.siteId) {
      const siteUnits = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.siteId, user.siteId), isNull(units.deletedAt)))
      allowedUnitIds = siteUnits.map(u => u.id)
    }

    // Build where conditions
    const conditions = [isNull(indicatorEntries.deletedAt)]

    // Apply allowed units filter
    if (allowedUnitIds !== null) {
      if (allowedUnitIds.length > 0) {
        if (unitId && allowedUnitIds.includes(unitId)) {
          conditions.push(eq(indicatorEntries.unitId, unitId))
        } else if (unitId) {
          // Requested a unit they don't have access to
          return { success: true, data: [] }
        } else {
          conditions.push(inArray(indicatorEntries.unitId, allowedUnitIds))
        }
      } else {
        // Restricted role but no units found
        return { success: true, data: [] }
      }
    } else if (unitId) {
      // Admin selecting specific unit
      conditions.push(eq(indicatorEntries.unitId, unitId))
    }

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
