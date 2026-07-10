import { db } from '../../database'
import { indicatorPlans, employees } from '../../database/schema'
import { logActivity } from '../../utils/activityLogger'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
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
      unitId: bodyUnitId,
    } = body

    if (!indicatorCategoryId || !judul) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Kategori dan Judul wajib diisi' }
    }

    // Determine siteId and unitId
    let targetSiteId = user.siteId
    let targetUnitId = null

    if (user.role === 'admin' && bodyUnitId) {
      targetUnitId = bodyUnitId
      // For siteId, admin uses their siteId or we can look up the unit's siteId
      targetSiteId = user.siteId
    } else {
      // Fetch unitId of current user's employee
      if (user.employeeId) {
        const [emp] = await db
          .select({ unitId: employees.unitId, siteId: employees.siteId })
          .from(employees)
          .where(eq(employees.id, user.employeeId))
          .limit(1)

        if (emp) {
          targetUnitId = emp.unitId
          targetSiteId = emp.siteId || user.siteId
        }
      }
    }

    if (!targetUnitId) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Unit Kerja tidak ditemukan untuk pengguna ini' }
    }

    if (!targetSiteId) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Site ID tidak ditemukan' }
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

    const [plan] = await db
      .insert(indicatorPlans)
      .values({
        siteId: targetSiteId,
        unitId: targetUnitId,
        indicatorCategoryId,
        judul: judul.trim(),
        status: 'proposed',
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
        createdBy: user.id,
      })
      .returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'indicator-plans',
      description: `Membuat usulan perencanaan indikator baru: ${plan.judul}`,
      details: { planId: plan.id }
    })

    setResponseStatus(event, 201)
    return {
      success: true,
      message: 'Usulan perencanaan indikator berhasil dibuat',
      data: plan,
    }
  } catch (error: any) {
    console.error('Error creating indicator plan:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to create indicator plan',
    }
  }
})
