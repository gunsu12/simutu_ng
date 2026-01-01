import { db } from '../../database'
import { indicatorUnits, units } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const indicatorId = query.indicatorId as string | undefined

    if (!indicatorId) {
      return {
        success: false,
        message: 'Indicator ID is required',
      }
    }

    const result = await db
      .select({
        id: indicatorUnits.id,
        indicatorId: indicatorUnits.indicatorId,
        unitId: indicatorUnits.unitId,
        unitName: units.name,
        unitCode: units.unitCode,
        createdAt: indicatorUnits.createdAt,
        updatedAt: indicatorUnits.updatedAt,
      })
      .from(indicatorUnits)
      .leftJoin(units, eq(indicatorUnits.unitId, units.id))
      .where(eq(indicatorUnits.indicatorId, indicatorId))

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Get indicator units error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator units',
    }
  }
})
