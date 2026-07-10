import { db } from '../../../database'
import { riskRegisters } from '../../../database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logActivity } from '../../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
    }

    if (user.role !== 'admin' && user.role !== 'auditor') {
      setResponseStatus(event, 403)
      return { success: false, message: 'Hanya administrator atau auditor yang dapat menyetujui risk register' }
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return { success: false, message: 'ID is required' }
    }

    // Fetch existing risk
    const [risk] = await db
      .select()
      .from(riskRegisters)
      .where(and(eq(riskRegisters.id, id), isNull(riskRegisters.deletedAt)))
      .limit(1)

    if (!risk) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Risk register tidak ditemukan' }
    }

    if (risk.status === 'approved') {
      setResponseStatus(event, 400)
      return { success: false, message: 'Risk register sudah disetujui sebelumnya' }
    }

    const [updatedRisk] = await db
      .update(riskRegisters)
      .set({
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
        rejectedNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(riskRegisters.id, id))
      .returning()

    await logActivity({
      event,
      action: 'APPROVE',
      module: 'risk-registers',
      description: `Menyetujui usulan risk register: ${risk.risiko}`,
      details: { riskId: risk.id }
    })

    return {
      success: true,
      message: 'Risk register berhasil disetujui',
      data: updatedRisk,
    }
  } catch (error: any) {
    console.error('Error approving risk register:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to approve risk register',
    }
  }
})
