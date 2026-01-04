import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, units, employees, divisions, users } from '../../database/schema'
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

    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'User not found',
      })
    }

    // Only manager and auditor roles can access
    if (!['manager', 'auditor', 'admin'].includes(user.role)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied. Only managers and auditors can access this resource.',
      })
    }

    // Parse query parameters for filtering
    const query = getQuery(event)
    
    // Parse date range parameters
    const startDateParam = query.startDate as string | undefined
    const endDateParam = query.endDate as string | undefined
    
    // Default to current month
    const now = new Date()
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate
    const endDate = endDateParam ? new Date(endDateParam) : defaultEndDate
    
    // Parse other filters
    const frequency = query.entryFrequency as string | undefined
    const status = query.status as string | undefined
    const divisionId = query.divisionId as string | undefined
    const unitId = query.unitId as string | undefined
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

    // Add unit filter if provided
    if (unitId) {
      conditions.push(eq(indicatorEntries.unitId, unitId))
    }

    // For manager role, restrict to their division only
    let allowedUnitIds: string[] | null = null
    
    if (user.role === 'manager') {
      // Get manager's division through their employee -> unit -> division
      if (!user.employeeId) {
        throw createError({
          statusCode: 403,
          message: 'Manager must have an employee record to access this resource.',
        })
      }

      // Get the employee's unit and division
      const employeeData = await db
        .select({
          unitId: employees.unitId,
          divisionId: units.divisionId,
        })
        .from(employees)
        .leftJoin(units, eq(employees.unitId, units.id))
        .where(eq(employees.id, user.employeeId))
        .limit(1)

      if (!employeeData.length || !employeeData[0].divisionId) {
        throw createError({
          statusCode: 403,
          message: 'Manager must be assigned to a unit with a division.',
        })
      }

      const managerDivisionId = employeeData[0].divisionId

      // Get all units in this division
      const divisionUnits = await db
        .select({ id: units.id })
        .from(units)
        .where(and(
          eq(units.divisionId, managerDivisionId),
          isNull(units.deletedAt)
        ))

      allowedUnitIds = divisionUnits.map(u => u.id)

      if (allowedUnitIds.length === 0) {
        // No units in division, return empty
        return {
          success: true,
          data: [],
          meta: {
            managerDivisionId,
          },
        }
      }

      conditions.push(inArray(indicatorEntries.unitId, allowedUnitIds))
    } else if (divisionId) {
      // For auditor/admin, filter by division if provided
      const divisionUnits = await db
        .select({ id: units.id })
        .from(units)
        .where(and(
          eq(units.divisionId, divisionId),
          isNull(units.deletedAt)
        ))

      const divisionUnitIds = divisionUnits.map(u => u.id)
      
      if (divisionUnitIds.length > 0) {
        conditions.push(inArray(indicatorEntries.unitId, divisionUnitIds))
      } else {
        // No units in division, return empty
        return {
          success: true,
          data: [],
        }
      }
    }

    // Build and execute query
    const entries = await db
      .select({
        entry: indicatorEntries,
        unit: units,
        division: divisions,
        createdByUser: users,
      })
      .from(indicatorEntries)
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .leftJoin(divisions, eq(units.divisionId, divisions.id))
      .leftJoin(users, eq(indicatorEntries.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(indicatorEntries.entryDate), desc(indicatorEntries.createdAt))

    // Fetch items for each entry
    const entriesWithItems = await Promise.all(
      entries.map(async ({ entry, unit, division, createdByUser }) => {
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
          division,
          createdByUser: createdByUser ? {
            id: createdByUser.id,
            name: createdByUser.name,
          } : null,
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
    console.error('Fetch verification entries error:', error)
    if (error.statusCode) {
      throw error
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch verification entries',
    }
  }
})
