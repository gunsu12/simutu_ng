import { db } from '../../database'
import { indicatorUnits } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      return {
        success: false,
        message: 'ID wajib diisi',
      }
    }

    await db.delete(indicatorUnits).where(eq(indicatorUnits.id, id))

    await logActivity({
      event,
      action: 'DELETE',
      module: 'indicators',
      description: `Menghapus unit dari indikator`,
      details: { indicatorUnitId: id }
    })

    return {
      success: true,
      message: 'Pendaftaran unit berhasil dihapus dari indikator',
    }
  } catch (error: any) {
    console.error('Delete indicator unit error:', error)
    return {
      success: false,
      message: error.message || 'Gagal menghapus pendaftaran unit dari indikator',
    }
  }
})
