import { db } from '../../../database'
import { indicatorPlans } from '../../../database/schema'
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
      return { success: false, message: 'Only administrators or auditors can reject plans' }
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return { success: false, message: 'ID is required' }
    }

    const body = await readBody(event)
    const { rejectedNotes } = body

    if (!rejectedNotes || rejectedNotes.trim() === '') {
      setResponseStatus(event, 400)
      return { success: false, message: 'Alasan penolakan wajib diisi' }
    }

    // Fetch existing plan
    const [plan] = await db
      .select()
      .from(indicatorPlans)
      .where(and(eq(indicatorPlans.id, id), isNull(indicatorPlans.deletedAt)))
      .limit(1)

    if (!plan) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Usulan perencanaan tidak ditemukan' }
    }

    if (plan.status === 'approved') {
      setResponseStatus(event, 400)
      return { success: false, message: 'Usulan yang sudah disetujui tidak dapat ditolak' }
    }

    const [updatedPlan] = await db
      .update(indicatorPlans)
      .set({
        status: 'rejected',
        rejectedNotes: rejectedNotes.trim(),
        updatedAt: new Date(),
      })
      .where(eq(indicatorPlans.id, id))
      .returning()

    await logActivity({
      event,
      action: 'REJECT',
      module: 'indicator-plans',
      description: `Menolak usulan perencanaan "${plan.judul}"`,
      details: { planId: plan.id, reason: rejectedNotes }
    })

    return {
      success: true,
      message: 'Usulan perencanaan indikator berhasil ditolak',
      data: updatedPlan,
    }
  } catch (error: any) {
    console.error('Error rejecting indicator plan:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to reject indicator plan',
    }
  }
})
