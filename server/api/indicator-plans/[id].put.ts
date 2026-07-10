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
      return { success: false, message: 'Usulan yang sudah disetujui tidak dapat diubah' }
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

    const body = await readBody(event)
    const {
      indicatorCategoryId,
      judul,
      k1, k2, k3, k4, k5, k6, k7, k8,
      dasarPemikiran,
      dimensiMutu,
      tujuan,
      definisiOperasional,
      jenisIndikator,
      satuanPengukuran,
      numerator,
      denominator,
      formula,
      target,
      targetUnit,
      targetKeterangan,
      targetIsZero,
      targetCalculationFormula,
      kriteriaInklusi,
      kriteriaEksklusi,
      metodePengumpulanData,
      sumberData,
      instrumenPengambilanData,
      besarSampel,
      caraPengambilanSampel,
      periodePengumpulanData,
      penyajianData,
      periodeAnalisisDanPelaporanData,
      penanggungJawab,
    } = body

    if (!indicatorCategoryId || !judul) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Kategori dan Judul wajib diisi' }
    }

    // Calculate total score
    const scoreK1 = Number(k1) || 1
    const scoreK2 = Number(k2) || 1
    const scoreK3 = Number(k3) || 1
    const scoreK4 = Number(k4) || 1
    const scoreK5 = Number(k5) || 1
    const scoreK6 = Number(k6) || 1
    const scoreK7 = Number(k7) || 1
    const scoreK8 = Number(k8) || 1
    const totalScore = scoreK1 + scoreK2 + scoreK3 + scoreK4 + scoreK5 + scoreK6 + scoreK7 + scoreK8

    const [updatedPlan] = await db
      .update(indicatorPlans)
      .set({
        indicatorCategoryId,
        judul: judul.trim(),
        k1: scoreK1,
        k2: scoreK2,
        k3: scoreK3,
        k4: scoreK4,
        k5: scoreK5,
        k6: scoreK6,
        k7: scoreK7,
        k8: scoreK8,
        totalScore,
        dasarPemikiran: dasarPemikiran || null,
        dimensiMutu: dimensiMutu || null,
        tujuan: tujuan || null,
        definisiOperasional: definisiOperasional || null,
        jenisIndikator: jenisIndikator || null,
        satuanPengukuran: satuanPengukuran || null,
        numerator: numerator || null,
        denominator: denominator || null,
        formula: formula || null,
        target: target || null,
        targetUnit: targetUnit || null,
        targetKeterangan: targetKeterangan || null,
        targetIsZero: targetIsZero || false,
        targetCalculationFormula: targetCalculationFormula || null,
        kriteriaInklusi: kriteriaInklusi || null,
        kriteriaEksklusi: kriteriaEksklusi || null,
        metodePengumpulanData: metodePengumpulanData || null,
        sumberData: sumberData || null,
        instrumenPengambilanData: instrumenPengambilanData || null,
        besarSampel: besarSampel || null,
        caraPengambilanSampel: caraPengambilanSampel || null,
        periodePengumpulanData: periodePengumpulanData || null,
        penyajianData: penyajianData || null,
        periodeAnalisisDanPelaporanData: periodeAnalisisDanPelaporanData || null,
        penanggungJawab: penanggungJawab || null,
        status: 'proposed', // Reset status to proposed when updated (in case it was rejected)
        updatedAt: new Date(),
      })
      .where(eq(indicatorPlans.id, id))
      .returning()

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'indicator-plans',
      description: `Memperbarui usulan perencanaan indikator: ${updatedPlan.judul}`,
      details: { planId: updatedPlan.id }
    })

    return {
      success: true,
      message: 'Usulan perencanaan indikator berhasil diperbarui',
      data: updatedPlan,
    }
  } catch (error: any) {
    console.error('Error updating indicator plan:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update indicator plan',
    }
  }
})
