import { db } from '../../database'
import { indicators, indicatorCategories } from '../../database/schema'
import { asc, eq, and, isNull, or, ilike, count, SQL } from 'drizzle-orm'
import { generateFileUrl } from '../../utils/s3'

/**
 * Extract S3 key from stored value.
 * Handles both old format (full URL) and new format (key only).
 */
function extractS3Key(storedValue: string | null): string | null {
  if (!storedValue) return null

  // If it's already a key (no http), return as-is
  if (!storedValue.includes('http')) {
    return storedValue
  }

  // Extract key from full URL (remove query string, get last 3 path segments)
  const urlParts = storedValue.split('?')[0]
  return urlParts.split('/').slice(-3).join('/')
}

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
    const search = query.search as string | undefined
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const offset = (page - 1) * limit

    const whereConditions: SQL[] = [
      isNull(indicators.deletedAt) // Filter out soft-deleted records
    ]

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

    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`
      whereConditions.push(
        or(
          ilike(indicators.code, searchPattern),
          ilike(indicators.judul, searchPattern),
          ilike(indicatorCategories.name, searchPattern)
        ) as SQL
      )
    }

    // Get total count for pagination
    const [totalRes] = await db
      .select({ value: count() })
      .from(indicators)
      .leftJoin(indicatorCategories, eq(indicators.indicatorCategoryId, indicatorCategories.id))
      .where(and(...whereConditions))

    const total = Number(totalRes.value) || 0

    const result = await db
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
        targetWeight: indicators.targetWeight,
        targetUnit: indicators.targetUnit,
        targetKeterangan: indicators.targetKeterangan,
        targetIsZero: indicators.targetIsZero,
        targetCalculationFormula: indicators.targetCalculationFormula,
        documentFile: indicators.documentFile,
        entryFrequency: indicators.entryFrequency,
        isActive: indicators.isActive,
        createdAt: indicators.createdAt,
        updatedAt: indicators.updatedAt,
        categoryName: indicatorCategories.name,
      })
      .from(indicators)
      .leftJoin(indicatorCategories, eq(indicators.indicatorCategoryId, indicatorCategories.id))
      .where(and(...whereConditions))
      .orderBy(asc(indicators.code))
      .limit(limit)
      .offset(offset)

    // Generate presigned URLs for document files
    const indicatorsWithUrls = await Promise.all(
      result.map(async (indicator) => {
        const key = extractS3Key(indicator.documentFile)
        if (key) {
          try {
            const signedUrl = await generateFileUrl(key)
            return { ...indicator, documentFile: signedUrl }
          } catch (error) {
            console.error('Error generating signed URL for', key, error)
          }
        }
        return indicator
      })
    )

    return {
      success: true,
      data: indicatorsWithUrls,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
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
