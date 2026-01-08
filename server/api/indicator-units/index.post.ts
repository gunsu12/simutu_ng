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
        message: 'ID Indikator dan ID Unit wajib diisi',
      }
    }

    const newIndicatorUnit = await db.insert(indicatorUnits).values({
      indicatorId,
      unitId,
    }).returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'indicators',
      description: `Menambahkan unit ke indikator`,
      details: { indicatorUnitId: newIndicatorUnit[0].id, indicatorId, unitId }
    })

    return {
      success: true,
      data: newIndicatorUnit[0],
      message: 'Unit berhasil didaftarkan ke indikator',
    }
  } catch (error: any) {
    console.error('Create indicator unit error:', error)
    return {
      success: false,
      message: error.message || 'Gagal mendaftarkan unit ke indikator',
    }
  }
})
