import { db } from '../../database'
import { indicatorPlans, indicatorCategories, units, users } from '../../database/schema'
import { eq, and, or, ilike, desc, count, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
    }

    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const offset = (page - 1) * limit
    const search = query.search ? String(query.search).trim() : ''
    const status = query.status ? String(query.status).trim() : ''
    const unitId = query.unitId ? String(query.unitId).trim() : ''

    const whereConditions = [isNull(indicatorPlans.deletedAt)]

    // Role-based visibility
    if (user.role !== 'admin' && user.role !== 'auditor') {
      if (!user.unitId) {
        return {
          success: true,
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        }
      }
      whereConditions.push(eq(indicatorPlans.unitId, user.unitId))
    } else {
      // Admin/Auditor can filter by unitId
      if (unitId) {
        whereConditions.push(eq(indicatorPlans.unitId, unitId))
      }
    }

    // Filter by status
    if (status) {
      whereConditions.push(eq(indicatorPlans.status, status))
    }

    // Filter by search query
    if (search) {
      whereConditions.push(ilike(indicatorPlans.judul, `%${search}%`))
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(indicatorPlans)
      .where(and(...whereConditions))

    const total = totalResult?.count || 0
    const totalPages = Math.ceil(total / limit)

    // Get plans list with category and unit name
    const data = await db
      .select({
        id: indicatorPlans.id,
        siteId: indicatorPlans.siteId,
        unitId: indicatorPlans.unitId,
        unitName: units.name,
        indicatorCategoryId: indicatorPlans.indicatorCategoryId,
        categoryName: indicatorCategories.name,
        judul: indicatorPlans.judul,
        status: indicatorPlans.status,
        totalScore: indicatorPlans.totalScore,
        createdAt: indicatorPlans.createdAt,
        creatorName: users.name,
      })
      .from(indicatorPlans)
      .leftJoin(indicatorCategories, eq(indicatorPlans.indicatorCategoryId, indicatorCategories.id))
      .leftJoin(units, eq(indicatorPlans.unitId, units.id))
      .leftJoin(users, eq(indicatorPlans.createdBy, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(indicatorPlans.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error: any) {
    console.error('Error fetching indicator plans:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator plans',
    }
  }
})
