import { db } from '../../../database'
import { indicatorPlans, indicators, indicatorProfiles, indicatorUnits } from '../../../database/schema'
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
      return { success: false, message: 'Only administrators or auditors can approve plans' }
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return { success: false, message: 'ID is required' }
    }

    const body = await readBody(event)
    const { code } = body

    if (!code || code.trim() === '') {
      setResponseStatus(event, 400)
      return { success: false, message: 'Kode Indikator wajib ditentukan untuk persetujuan' }
    }

    const targetCode = code.trim()

    // Check if code is already in use
    const [existingCodeIndicator] = await db
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.code, targetCode))
      .limit(1)

    if (existingCodeIndicator) {
      setResponseStatus(event, 400)
      return { success: false, message: `Kode Indikator "${targetCode}" sudah digunakan. Silakan gunakan kode lain.` }
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
      return { success: false, message: 'Usulan ini sudah disetujui sebelumnya' }
    }

    // Perform transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create live indicator
      const [newIndicator] = await tx
        .insert(indicators)
        .values({
          siteId: plan.siteId,
          indicatorCategoryId: plan.indicatorCategoryId,
          code: targetCode,
          judul: plan.judul,
          dimensiMutu: plan.dimensiMutu,
          tujuan: plan.tujuan,
          definisiOperasional: plan.definisiOperasional,
          formula: plan.formula,
          numerator: plan.numerator,
          denominator: plan.denominator,
          target: plan.target,
          targetWeight: 0, // default target weight
          targetUnit: plan.targetUnit,
          targetKeterangan: plan.targetKeterangan,
          targetIsZero: plan.targetIsZero,
          targetCalculationFormula: plan.targetCalculationFormula,
          entryFrequency: 'monthly', // default monthly
          isActive: true,
        })
        .returning()

      // 2. Create profile linked to live indicator
      const [profile] = await tx
        .insert(indicatorProfiles)
        .values({
          indicatorId: newIndicator.id,
          dasarPemikiran: plan.dasarPemikiran,
          jenisIndikator: plan.jenisIndikator,
          satuanPengukuran: plan.satuanPengukuran,
          kriteriaInklusi: plan.kriteriaInklusi,
          kriteriaEksklusi: plan.kriteriaEksklusi,
          metodePengumpulanData: plan.metodePengumpulanData,
          sumberData: plan.sumberData,
          instrumenPengambilanData: plan.instrumenPengambilanData,
          besarSampel: plan.besarSampel,
          caraPengambilanSampel: plan.caraPengambilanSampel,
          periodePengumpulanData: plan.periodePengumpulanData,
          penyajianData: plan.penyajianData,
          periodeAnalisisDanPelaporanData: plan.periodeAnalisisDanPelaporanData,
          penanggungJawab: plan.penanggungJawab,
        })
        .returning()

      // 3. Map unit to indicator
      await tx
        .insert(indicatorUnits)
        .values({
          indicatorId: newIndicator.id,
          unitId: plan.unitId,
        })

      // 4. Update status in indicator_plans
      const [updatedPlan] = await tx
        .update(indicatorPlans)
        .set({
          status: 'approved',
          approvedBy: user.id,
          approvedAt: new Date(),
          indicatorId: newIndicator.id,
        })
        .where(eq(indicatorPlans.id, id))
        .returning()

      return { newIndicator, profile, updatedPlan }
    })

    await logActivity({
      event,
      action: 'APPROVE',
      module: 'indicator-plans',
      description: `Menyetujui usulan perencanaan "${plan.judul}" menjadi Indikator Aktif: ${targetCode}`,
      details: { planId: plan.id, indicatorId: result.newIndicator.id, code: targetCode }
    })

    return {
      success: true,
      message: 'Usulan perencanaan indikator berhasil disetujui dan dipublikasikan',
      data: result,
    }
  } catch (error: any) {
    console.error('Error approving indicator plan:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to approve indicator plan',
    }
  }
})
