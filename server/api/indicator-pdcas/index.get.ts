import { db } from '../../database'
import { indicatorPdcas, indicatorEntryItems, indicators, indicatorEntries, units, users, employees, divisions, sites } from '../../database/schema'
import { eq, isNull, desc, and, gte, lte, or, inArray } from 'drizzle-orm'

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
    const entryItemId = query.entryItemId as string | undefined
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    const siteIdParam = query.siteId as string | undefined
    const divisionIdParam = query.divisionId as string | undefined
    const unitIdParam = query.unitId as string | undefined

    // Role-based filtering logic
    const roleConditions = []

    if (user.role === 'user') {
      // User can only see PDCA from their unit
      // Fetch user's unitId from employees table
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
      // Manager can see PDCA from units in their division OR units they head
      if (user.employeeId) {
        // Find divisions managed by this user
        const managedDivisions = await db
          .select({ id: divisions.id })
          .from(divisions)
          .where(eq(divisions.managerId, user.employeeId))

        const managedDivisionIds = managedDivisions.map(d => d.id)

        // Find units headed by this user
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
          roleConditions.push(or(...managerFilters))
        } else {
          // If manager manages nothing, they see nothing (or fall back to their own unit?)
          // Fallback to their own unit id if they are assigned to one
          const employeeData = await db
            .select({ unitId: employees.unitId })
            .from(employees)
            .where(eq(employees.id, user.employeeId))
            .limit(1)

          if (employeeData.length > 0 && employeeData[0].unitId) {
            roleConditions.push(eq(indicatorEntries.unitId, employeeData[0].unitId))
          } else {
            // Safest fallback: see nothing
            roleConditions.push(eq(indicatorEntries.id, '00000000-0000-0000-0000-000000000000'))
          }
        }
      }
    } else if (user.role === 'auditor') {
      // Auditor can see all on their site
      if (user.siteId) {
        roleConditions.push(eq(sites.id, user.siteId))
      }
    }
    // Admin sees all, no roleConditions needed

    // General Filters
    const filterConditions = [isNull(indicatorPdcas.deletedAt)]

    if (entryItemId) {
      filterConditions.push(eq(indicatorPdcas.entryItemId, entryItemId))
    }

    if (startDate) {
      filterConditions.push(gte(indicatorPdcas.pdcaDate, new Date(startDate)))
    }

    if (endDate) {
      filterConditions.push(lte(indicatorPdcas.pdcaDate, new Date(endDate)))
    }

    if (unitIdParam) {
      filterConditions.push(eq(indicatorEntries.unitId, unitIdParam))
    }

    if (divisionIdParam) {
      filterConditions.push(eq(units.divisionId, divisionIdParam))
    }

    if (siteIdParam) {
      filterConditions.push(eq(sites.id, siteIdParam))
    }

    const pdcaList = await db
      .select({
        pdca: indicatorPdcas,
        entryItem: indicatorEntryItems,
        indicator: indicators,
        entry: indicatorEntries,
        unit: units,
        createdByUser: users,
        division: divisions,
        site: sites,
      })
      .from(indicatorPdcas)
      .leftJoin(indicatorEntryItems, eq(indicatorPdcas.entryItemId, indicatorEntryItems.id))
      .leftJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .leftJoin(indicatorEntries, eq(indicatorEntryItems.indicatorEntryId, indicatorEntries.id))
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .leftJoin(users, eq(indicatorPdcas.createdBy, users.id))
      // Join for filtering
      .leftJoin(divisions, eq(units.divisionId, divisions.id))
      .leftJoin(sites, eq(divisions.siteId, sites.id))
      .where(and(...filterConditions, ...roleConditions))
      .orderBy(desc(indicatorPdcas.createdAt))

    return {
      success: true,
      data: pdcaList.map(({ pdca, entryItem, indicator, entry, unit, createdByUser, division, site }) => ({
        ...pdca,
        entryItem: entryItem ? {
          ...entryItem,
          indicator,
        } : null,
        entry,
        unit: {
          ...unit,
          division,
          site
        },
        createdByUser: createdByUser ? {
          id: createdByUser.id,
          name: createdByUser.name,
        } : null,
      })),
    }
  } catch (error: any) {
    console.error('Fetch PDCA list error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch PDCA list',
    }
  }
})
