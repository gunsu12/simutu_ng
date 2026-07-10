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
      return { success: false, message: 'Hanya administrator atau auditor yang dapat menolak risk register' }
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return { success: false, message: 'ID is required' }
    }

    const body = await readBody(event)
    const { notes } = body

    if (!notes || notes.trim() === '') {
      setResponseStatus(event, 400)
      return { success: false, message: 'Alasan penolakan wajib diisi' }
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

    const [updatedRisk] = await db
      .update(riskRegisters)
      .set({
        status: 'rejected',
        rejectedNotes: notes.trim(),
        updatedAt: new Date(),
      })
      .where(eq(riskRegisters.id, id))
      .returning()

    await logActivity({
      event,
      action: 'REJECT',
      module: 'risk-registers',
      description: `Menolak usulan risk register: ${risk.risiko}. Alasan: ${notes.trim()}`,
      details: { riskId: risk.id }
    })

    return {
      success: true,
      message: 'Risk register berhasil ditolak',
      data: updatedRisk,
    }
  } catch (error: any) {
    console.error('Error rejecting risk register:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to reject risk register',
    }
  }
})
