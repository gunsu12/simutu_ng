import { db } from '../../../database'
import { indicators, indicatorUnits } from '../../../database/schema'
import { eq, isNull, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const unitId = event.context.params?.unitId
    if (!unitId) {
      throw createError({
        statusCode: 400,
        message: 'Unit ID is required',
      })
    }

    // Get the entry_frequency from query params if provided
    const query = getQuery(event)
    const entryFrequency = query.entryFrequency as string | undefined

    // Fetch indicators available for this unit
    const availableIndicators = await db
      .select({
        indicator: indicators,
      })
      .from(indicatorUnits)
      .innerJoin(indicators, eq(indicatorUnits.indicatorId, indicators.id))
      .where(
        and(
          eq(indicatorUnits.unitId, unitId),
          isNull(indicators.deletedAt),
          eq(indicators.isActive, true),
          entryFrequency ? eq(indicators.entryFrequency, entryFrequency) : undefined
        )
      )

    return {
      success: true,
      data: availableIndicators.map(({ indicator }) => indicator),
    }
  } catch (error: any) {
    console.error('Fetch unit indicators error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch unit indicators',
    }
  }
})
