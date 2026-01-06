import { db } from '../../database'
import { users, employees, sites } from '../../database/schema'
import { eq, and, or, ilike, isNull, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const offset = (page - 1) * limit

    // Build where conditions
    const conditions = [isNull(users.deletedAt)]

    if (search && search !== '') {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.username, `%${search}%`),
          ilike(users.email, `%${search}%`)
        ) as any
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause as any)

    const total = Number(countResult[0]?.count) || 0

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        employeeId: users.employeeId,
        siteId: users.siteId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        employeeName: employees.fullName,
        siteName: sites.name,
      })
      .from(users)
      .leftJoin(employees, eq(users.employeeId, employees.id))
      .leftJoin(sites, eq(users.siteId, sites.id))
      .where(whereClause as any)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data: allUsers,
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
      message: error.message || 'Failed to fetch users',
    }
  }
})
