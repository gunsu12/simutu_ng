import { db } from '../../database'
import { indicatorEntryItems, indicators, indicatorEntries, units, indicatorPdcas, employees, divisions, sites } from '../../database/schema'
import { eq, isNull, and, desc, sql, gte, lte, or, inArray } from 'drizzle-orm'

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

    const query = getQuery(event)
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    const siteIdParam = query.siteId as string | undefined
    const divisionIdParam = query.divisionId as string | undefined
    const unitIdParam = query.unitId as string | undefined

    // Role-based filtering logic
    const roleConditions = []

    if (user.role === 'user') {
      if (user.employeeId) {
        const employeeData = await db
          .select({ unitId: employees.unitId })
          .from(employees)
          .where(eq(employees.id, user.employeeId))
          .limit(1)

        if (employeeData.length > 0 && employeeData[0].unitId) {
          roleConditions.push(eq(indicatorEntries.unitId, employeeData[0].unitId))
        }
      }
    } else if (user.role === 'manager') {
      if (user.employeeId) {
        const managedDivisions = await db
          .select({ id: divisions.id })
          .from(divisions)
          .where(eq(divisions.managerId, user.employeeId))

        const managedDivisionIds = managedDivisions.map(d => d.id)

        const headedUnits = await db
          .select({ id: units.id })
          .from(units)
          .where(eq(units.headOfUnit, user.employeeId))

        const headedUnitIds = headedUnits.map(u => u.id)

        const managerFilters = []
        if (managedDivisionIds.length > 0) {
          managerFilters.push(inArray(units.divisionId, managedDivisionIds))
        }
        if (headedUnitIds.length > 0) {
          managerFilters.push(inArray(units.id, headedUnitIds))
        }

        if (managerFilters.length > 0) {
          roleConditions.push(or(...managerFilters)!)
        } else {
          const employeeData = await db
            .select({ unitId: employees.unitId })
            .from(employees)
            .where(eq(employees.id, user.employeeId))
            .limit(1)

          if (employeeData.length > 0 && employeeData[0].unitId) {
            roleConditions.push(eq(indicatorEntries.unitId, employeeData[0].unitId))
          } else {
            roleConditions.push(eq(indicatorEntries.id, '00000000-0000-0000-0000-000000000000'))
          }
        }
      }
    } else if (user.role === 'auditor') {
      if (user.siteId) {
        roleConditions.push(eq(sites.id, user.siteId))
      }
    }

    const conditions = [
      eq(indicatorEntryItems.isNeedPDCA, true),
      isNull(indicatorEntries.deletedAt)
    ]

    if (startDate) {
      conditions.push(gte(indicatorEntries.entryDate, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(indicatorEntries.entryDate, new Date(endDate)))
    }

    if (unitIdParam) {
      conditions.push(eq(indicatorEntries.unitId, unitIdParam))
    }

    if (divisionIdParam) {
      conditions.push(eq(units.divisionId, divisionIdParam))
    }

    if (siteIdParam) {
      conditions.push(eq(sites.id, siteIdParam))
    }

    // Get indicator entry items that need PDCA (isNeedPDCA = true)
    const items = await db
      .select({
        entryItem: indicatorEntryItems,
        indicator: indicators,
        entry: indicatorEntries,
        unit: units,
      })
      .from(indicatorEntryItems)
      .innerJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .innerJoin(indicatorEntries, eq(indicatorEntryItems.indicatorEntryId, indicatorEntries.id))
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .leftJoin(divisions, eq(units.divisionId, divisions.id))
      .leftJoin(sites, eq(divisions.siteId, sites.id))
      .where(and(...conditions, ...roleConditions))
      .orderBy(desc(indicatorEntries.entryDate))

    // Get existing PDCAs for these items to mark which ones already have PDCA
    const itemIds = items.map(item => item.entryItem.id)

    let existingPdcaMap: Record<string, boolean> = {}
    if (itemIds.length > 0) {
      const existingPdcas = await db
        .select({
          entryItemId: indicatorPdcas.entryItemId,
        })
        .from(indicatorPdcas)
        .where(
          and(
            sql`${indicatorPdcas.entryItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`,
            isNull(indicatorPdcas.deletedAt)
          )
        )

      existingPdcaMap = existingPdcas.reduce((acc, pdca) => {
        acc[pdca.entryItemId] = true
        return acc
      }, {} as Record<string, boolean>)
    }

    return {
      success: true,
      data: items.map(({ entryItem, indicator, entry, unit }) => ({
        ...entryItem,
        indicator,
        entry: {
          id: entry.id,
          entryCode: entry.entryCode,
          entryDate: entry.entryDate,
          status: entry.status,
        },
        unit: unit ? {
          id: unit.id,
          name: unit.name,
          unitCode: unit.unitCode,
        } : null,
        hasPdca: existingPdcaMap[entryItem.id] || false,
      })),
    }
  } catch (error: any) {
    console.error('Fetch PDCA needs error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator entries needing PDCA',
    }
  }
})
