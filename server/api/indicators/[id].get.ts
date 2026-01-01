import { db } from '../../database'
import { indicators, indicatorCategories } from '../../database/schema'
import { eq } from 'drizzle-orm'

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

    return {
      success: true,
      data: indicator,
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
