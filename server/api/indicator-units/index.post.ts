import { db } from '../../database'
import { indicatorUnits } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { indicatorId, unitId } = body

    if (!indicatorId || !unitId) {
      return {
        success: false,
        message: 'Indicator ID and Unit ID are required',
      }
    }

    const newIndicatorUnit = await db.insert(indicatorUnits).values({
      indicatorId,
      unitId,
    }).returning()

    return {
      success: true,
      data: newIndicatorUnit[0],
      message: 'Unit assigned to indicator successfully',
    }
  } catch (error: any) {
    console.error('Create indicator unit error:', error)
    return {
      success: false,
      message: error.message || 'Failed to assign unit to indicator',
    }
  }
})
