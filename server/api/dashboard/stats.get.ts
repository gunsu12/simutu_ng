import { db } from '../../database'
import { 
  indicators, 
  indicatorEntries, 
  indicatorEntryItems, 
  indicatorPdcas, 
  indicatorUnits,
  units,
  employees
} from '../../database/schema'
import { eq, and, isNull, gte, lte, count, sql, inArray } from 'drizzle-orm'

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
    const month = parseInt(query.month as string) || new Date().getMonth() + 1
    const year = parseInt(query.year as string) || new Date().getFullYear()
    const unitId = query.unitId as string | undefined

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

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Build base conditions
    const siteConditions = user.role === 'admin' 
      ? [isNull(indicators.deletedAt)]
      : [isNull(indicators.deletedAt), eq(indicators.siteId, user.siteId!)]

    // 1. Count active indicators (for the unit if specified)
    let activeIndicatorsCount = 0
    if (filterUnitId) {
      // Count indicators assigned to this unit
      const assignedIndicators = await db
        .select({ count: count() })
        .from(indicatorUnits)
        .innerJoin(indicators, eq(indicatorUnits.indicatorId, indicators.id))
        .where(and(
          eq(indicatorUnits.unitId, filterUnitId),
          eq(indicators.isActive, true),
          isNull(indicators.deletedAt)
        ))
      activeIndicatorsCount = assignedIndicators[0]?.count || 0
    } else {
      // Count all active indicators for the site
      const allIndicators = await db
        .select({ count: count() })
        .from(indicators)
        .where(and(...siteConditions, eq(indicators.isActive, true)))
      activeIndicatorsCount = allIndicators[0]?.count || 0
    }

    // 2. Count indicator entries this month
    const entryConditions = [
      isNull(indicatorEntries.deletedAt),
      gte(indicatorEntries.entryDate, startDate),
      lte(indicatorEntries.entryDate, endDate)
    ]
    
    if (filterUnitId) {
      entryConditions.push(eq(indicatorEntries.unitId, filterUnitId))
    }

    const entriesThisMonth = await db
      .select({ count: count() })
      .from(indicatorEntries)
      .where(and(...entryConditions))
    const entriesCount = entriesThisMonth[0]?.count || 0

    // 3. Count PDCAs created this month
    const pdcaConditions = [
      isNull(indicatorPdcas.deletedAt),
      gte(indicatorPdcas.createdAt, startDate),
      lte(indicatorPdcas.createdAt, endDate)
    ]

    let pdcasCount = 0
    if (filterUnitId) {
      // Get PDCA count for the specific unit
      const pdcaResult = await db
        .select({ count: count() })
        .from(indicatorPdcas)
        .innerJoin(indicatorEntryItems, eq(indicatorPdcas.entryItemId, indicatorEntryItems.id))
        .innerJoin(indicatorEntries, eq(indicatorEntryItems.indicatorEntryId, indicatorEntries.id))
        .where(and(
          ...pdcaConditions,
          eq(indicatorEntries.unitId, filterUnitId)
        ))
      pdcasCount = pdcaResult[0]?.count || 0
    } else {
      const pdcaResult = await db
        .select({ count: count() })
        .from(indicatorPdcas)
        .where(and(...pdcaConditions))
      pdcasCount = pdcaResult[0]?.count || 0
    }

    // 4. Count unfinished indicator entries (status != 'finish')
    const unfinishedConditions = [
      isNull(indicatorEntries.deletedAt),
      sql`${indicatorEntries.status} != 'finish'`
    ]
    
    if (filterUnitId) {
      unfinishedConditions.push(eq(indicatorEntries.unitId, filterUnitId))
    }

    const unfinishedEntries = await db
      .select({ count: count() })
      .from(indicatorEntries)
      .where(and(...unfinishedConditions))
    const unfinishedCount = unfinishedEntries[0]?.count || 0

    return {
      success: true,
      data: {
        activeIndicators: activeIndicatorsCount,
        entriesThisMonth: entriesCount,
        pdcasCreated: pdcasCount,
        unfinishedEntries: unfinishedCount,
        filterMonth: month,
        filterYear: year,
        filterUnitId: filterUnitId || null
      }
    }
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch dashboard stats',
    }
  }
})
