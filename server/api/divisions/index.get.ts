import { db } from '../../database'
import { divisions, sites } from '../../database/schema'
import { eq, and, isNull, sql, ilike, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const siteId = query.siteId as string
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const offset = (page - 1) * limit

    const conditions = [isNull(divisions.deletedAt)]

    if (siteId && siteId !== '') {
      conditions.push(eq(divisions.siteId, siteId))
    }

    if (search && search !== '') {
      conditions.push(
        or(
          ilike(divisions.name, `%${search}%`),
          ilike(divisions.code, `%${search}%`),
          ilike(divisions.description, `%${search}%`)
        ) as any
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(divisions)
      .where(whereClause as any)

    const total = Number(countResult[0]?.count) || 0

    const allDivisions = await db
      .select({
        id: divisions.id,
        siteId: divisions.siteId,
        code: divisions.code,
        name: divisions.name,
        description: divisions.description,
        createdAt: divisions.createdAt,
        updatedAt: divisions.updatedAt,
        siteName: sites.name,
      })
      .from(divisions)
      .leftJoin(sites, eq(divisions.siteId, sites.id))
      .where(whereClause as any)
      .orderBy(divisions.createdAt)
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data: allDivisions,
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
      message: error.message || 'Failed to fetch divisions',
    }
  }
})
