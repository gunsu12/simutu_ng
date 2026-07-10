import { db } from '../../database'
import { indicatorPlans, employees } from '../../database/schema'
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

    // Fetch existing plan
    const [existingPlan] = await db
      .select()
      .from(indicatorPlans)
      .where(and(eq(indicatorPlans.id, id), isNull(indicatorPlans.deletedAt)))
      .limit(1)

    if (!existingPlan) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Usulan perencanaan tidak ditemukan' }
    }

    // Check status
    if (existingPlan.status === 'approved') {
      setResponseStatus(event, 400)
      return { success: false, message: 'Usulan yang sudah disetujui tidak dapat dihapus' }
    }

    // Role-based verification
    if (user.role !== 'admin' && user.role !== 'auditor') {
      let userUnitId = user.unitId
      if (!userUnitId && user.employeeId) {
        const [emp] = await db
          .select({ unitId: employees.unitId })
          .from(employees)
          .where(eq(employees.id, user.employeeId))
          .limit(1)
        if (emp) userUnitId = emp.unitId
      }

      if (existingPlan.unitId !== userUnitId) {
        setResponseStatus(event, 403)
        return { success: false, message: 'Forbidden' }
      }
    }

    await db
      .update(indicatorPlans)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(indicatorPlans.id, id))

    await logActivity({
      event,
      action: 'DELETE',
      module: 'indicator-plans',
      description: `Menghapus usulan perencanaan indikator: ${existingPlan.judul}`,
      details: { planId: existingPlan.id }
    })

    return {
      success: true,
      message: 'Usulan perencanaan indikator berhasil dihapus',
    }
  } catch (error: any) {
    console.error('Error deleting indicator plan:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to delete indicator plan',
    }
  }
})
