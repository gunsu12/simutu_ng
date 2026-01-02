import { db } from '../../database'
import { indicators, indicatorCategories } from '../../database/schema'
import { eq } from 'drizzle-orm'
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
    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'ID is required',
      }
    }

    const [indicator] = await db
      .select({
        id: indicators.id,
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
        createdAt: indicators.createdAt,
        updatedAt: indicators.updatedAt,
        categoryName: indicatorCategories.name,
      })
      .from(indicators)
      .leftJoin(indicatorCategories, eq(indicators.indicatorCategoryId, indicatorCategories.id))
      .where(eq(indicators.id, id))
      .limit(1)

    if (!indicator) {
      setResponseStatus(event, 404)
      return {
        success: false,
        message: 'Indicator not found',
      }
    }

    // Generate presigned URL for document file if exists
    let indicatorData = indicator
    const key = extractS3Key(indicator.documentFile)
    if (key) {
      try {
        const signedUrl = await generateFileUrl(key)
        indicatorData = { ...indicator, documentFile: signedUrl }
      } catch (error) {
        console.error('Error generating signed URL:', error)
      }
    }

    return {
      success: true,
      data: indicatorData,
    }
  } catch (error: any) {
    console.error('Error fetching indicator:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator',
    }
  }
})
