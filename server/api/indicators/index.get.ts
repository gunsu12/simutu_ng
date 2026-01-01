import { db } from '../../database'
import { indicators, indicatorCategories } from '../../database/schema'
import { asc, eq, and } from 'drizzle-orm'

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
    const categoryId = query.categoryId as string | undefined
    const siteIdFilter = query.siteId as string | undefined

    const whereConditions: any[] = []
    
    // Admin can see all sites or filter by specific site
    // Regular users only see their own site
    if (user.role === 'admin') {
      if (siteIdFilter) {
        whereConditions.push(eq(indicators.siteId, siteIdFilter))
      }
    } else {
      if (!user.siteId) {
        setResponseStatus(event, 403)
        return {
          success: false,
          message: 'User must be assigned to a site',
        }
      }
      whereConditions.push(eq(indicators.siteId, user.siteId))
    }
    
    if (categoryId) {
      whereConditions.push(eq(indicators.indicatorCategoryId, categoryId))
    }

    let queryBuilder = db
      .select({
        id: indicators.id,
        siteId: indicators.siteId,
        indicatorCategoryId: indicators.indicatorCategoryId,
        code: indicators.code,
        judul: indicators.judul,
        dimensiMutu: indicators.dimensiMutu,
        tujuan: indicators.tujuan,
        definisiOperasional: indicators.definisiOperasional,
        formula: indicators.formula,
        numerator: indicators.numerator,
        denominator: indicators.denominator,
        target: indicators.target,
        targetUnit: indicators.targetUnit,
        targetKeterangan: indicators.targetKeterangan,
        targetIsZero: indicators.targetIsZero,
        targetCalculationFormula: indicators.targetCalculationFormula,
        documentFile: indicators.documentFile,
        createdAt: indicators.createdAt,
        updatedAt: indicators.updatedAt,
        categoryName: indicatorCategories.name,
      })
      .from(indicators)
      .leftJoin(indicatorCategories, eq(indicators.indicatorCategoryId, indicatorCategories.id))

    if (whereConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...whereConditions))
    }

    const result = await queryBuilder.orderBy(asc(indicators.code))

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Error fetching indicators:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicators',
    }
  }
})
