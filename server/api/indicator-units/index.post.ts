import { db } from '../../database'
import { indicatorUnits } from '../../database/schema'
import { logActivity } from '../../utils/activityLogger'

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

    await logActivity({
      event,
      action: 'CREATE',
      module: 'indicator-units',
      description: `Menambahkan unit ke indikator`,
      details: { indicatorUnitId: newIndicatorUnit[0].id, indicatorId, unitId }
    })

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
