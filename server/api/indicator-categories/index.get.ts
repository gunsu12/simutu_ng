import { db } from '../../database'
import { indicatorCategories } from '../../database/schema'
import { asc, eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    
    if (!user) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Unauthorized',
      }
    }

    const query = getQuery(event)
    const siteIdFilter = query.siteId as string | undefined

    // Admin can see all sites or filter by specific site
    // Regular users only see their own site
    let queryBuilder = db
      .select()
      .from(indicatorCategories)
      .where(isNull(indicatorCategories.deletedAt))

    if (user.role === 'admin') {
      if (siteIdFilter) {
        queryBuilder = queryBuilder.where(and(
          isNull(indicatorCategories.deletedAt),
          eq(indicatorCategories.siteId, siteIdFilter)
        ))
      }
    } else {
      if (!user.siteId) {
        setResponseStatus(event, 403)
        return {
          success: false,
          message: 'User must be assigned to a site',
        }
      }
      queryBuilder = queryBuilder.where(and(
        isNull(indicatorCategories.deletedAt),
        eq(indicatorCategories.siteId, user.siteId)
      ))
    }

    const categories = await queryBuilder.orderBy(asc(indicatorCategories.name))

    return {
      success: true,
      data: categories,
    }
  } catch (error: any) {
    console.error('Error fetching indicator categories:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator categories',
    }
  }
})
