import { db } from '../../database'
import { units, divisions, employees, sites } from '../../database/schema'
import { eq, and, isNull, sql, ilike, or } from 'drizzle-orm'

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
    const siteIdParam = query.siteId as string
    const unitIdParam = query.id as string
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const offset = (page - 1) * limit

    const conditions = [isNull(units.deletedAt)]

    // Role-based filtering
    if (user.role === 'user' && user.unitId) {
      conditions.push(eq(units.id, user.unitId))
    } else if (user.role === 'manager' && user.employeeId) {
      conditions.push(eq(units.headOfUnit, user.employeeId))
    } else if (user.role === 'auditor' && user.siteId) {
      conditions.push(eq(units.siteId, user.siteId))
    }

    // Additional query filters
    if (siteIdParam && siteIdParam !== '') {
      conditions.push(eq(units.siteId, siteIdParam))
    }

    if (unitIdParam && unitIdParam !== '') {
      conditions.push(eq(units.id, unitIdParam))
    }

    if (search && search !== '') {
      conditions.push(
        or(
          ilike(units.name, `%${search}%`),
          ilike(units.unitCode, `%${search}%`),
          ilike(units.description, `%${search}%`),
          ilike(units.location, `%${search}%`)
        ) as any
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(units)
      .where(whereClause as any)

    const total = Number(countResult[0]?.count) || 0

    const allUnits = await db
      .select({
        id: units.id,
        siteId: units.siteId,
        unitCode: units.unitCode,
        divisionId: units.divisionId,
        name: units.name,
        description: units.description,
        location: units.location,
        headOfUnit: units.headOfUnit,
        createdAt: units.createdAt,
        updatedAt: units.updatedAt,
        siteName: sites.name,
        divisionName: divisions.name,
        headOfUnitName: employees.fullName,
      })
      .from(units)
      .leftJoin(sites, eq(units.siteId, sites.id))
      .leftJoin(divisions, eq(units.divisionId, divisions.id))
      .leftJoin(employees, eq(units.headOfUnit, employees.id))
      .where(whereClause as any)
      .orderBy(units.createdAt)
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data: allUnits,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch units',
    }
  }
})
