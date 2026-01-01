import { db } from '../../database'
import { indicators, indicatorCategories } from '../../database/schema'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const categoryId = query.categoryId as string | undefined

    let indicatorsQuery = db
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

    if (categoryId) {
      indicatorsQuery = indicatorsQuery.where(eq(indicators.indicatorCategoryId, categoryId))
    }

    const result = await indicatorsQuery.orderBy(asc(indicators.code))

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
