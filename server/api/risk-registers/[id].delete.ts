import { db } from '../../database'
import { riskRegisters } from '../../database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return { success: false, message: 'ID is required' }
    }

    // Fetch existing risk register
    const [existingRisk] = await db
      .select()
      .from(riskRegisters)
      .where(and(eq(riskRegisters.id, id), isNull(riskRegisters.deletedAt)))
      .limit(1)

    if (!existingRisk) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Risk register tidak ditemukan' }
    }

    // Role-based visibility and delete restrictions
    if (user.role !== 'admin' && user.role !== 'auditor') {
      if (existingRisk.unitId !== user.unitId) {
        setResponseStatus(event, 403)
        return { success: false, message: 'Forbidden' }
      }

      if (existingRisk.status === 'approved') {
        setResponseStatus(event, 400)
        return { success: false, message: 'Risk register yang sudah disetujui tidak dapat dihapus' }
      }
    }

    // Soft delete
    const [deletedRisk] = await db
      .update(riskRegisters)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(riskRegisters.id, id))
      .returning()

    await logActivity({
      event,
      action: 'DELETE',
      module: 'risk-registers',
      description: `Menghapus usulan risk register: ${deletedRisk.risiko}`,
      details: { riskId: deletedRisk.id }
    })

    return {
      success: true,
      message: 'Risk register berhasil dihapus',
    }
  } catch (error: any) {
    console.error('Error deleting risk register:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to delete risk register',
    }
  }
})
