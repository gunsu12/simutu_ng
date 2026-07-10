import { db } from '../../database'
import { indicatorPlans, indicatorCategories, units, users } from '../../database/schema'
import { eq, and, isNull } from 'drizzle-orm'

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

    const [plan] = await db
      .select({
        id: indicatorPlans.id,
        siteId: indicatorPlans.siteId,
        unitId: indicatorPlans.unitId,
        unitName: units.name,
        indicatorCategoryId: indicatorPlans.indicatorCategoryId,
        categoryName: indicatorCategories.name,
        judul: indicatorPlans.judul,
        status: indicatorPlans.status,
        k1: indicatorPlans.k1,
        k2: indicatorPlans.k2,
        k3: indicatorPlans.k3,
        k4: indicatorPlans.k4,
        k5: indicatorPlans.k5,
        k6: indicatorPlans.k6,
        k7: indicatorPlans.k7,
        k8: indicatorPlans.k8,
        totalScore: indicatorPlans.totalScore,
        dasarPemikiran: indicatorPlans.dasarPemikiran,
        dimensiMutu: indicatorPlans.dimensiMutu,
        tujuan: indicatorPlans.tujuan,
        definisiOperasional: indicatorPlans.definisiOperasional,
        jenisIndikator: indicatorPlans.jenisIndikator,
        satuanPengukuran: indicatorPlans.satuanPengukuran,
        numerator: indicatorPlans.numerator,
        denominator: indicatorPlans.denominator,
        formula: indicatorPlans.formula,
        target: indicatorPlans.target,
        targetUnit: indicatorPlans.targetUnit,
        targetKeterangan: indicatorPlans.targetKeterangan,
        targetIsZero: indicatorPlans.targetIsZero,
        targetCalculationFormula: indicatorPlans.targetCalculationFormula,
        kriteriaInklusi: indicatorPlans.kriteriaInklusi,
        kriteriaEksklusi: indicatorPlans.kriteriaEksklusi,
        metodePengumpulanData: indicatorPlans.metodePengumpulanData,
        sumberData: indicatorPlans.sumberData,
        instrumenPengambilanData: indicatorPlans.instrumenPengambilanData,
        besarSampel: indicatorPlans.besarSampel,
        caraPengambilanSampel: indicatorPlans.caraPengambilanSampel,
        periodePengumpulanData: indicatorPlans.periodePengumpulanData,
        penyajianData: indicatorPlans.penyajianData,
        periodeAnalisisDanPelaporanData: indicatorPlans.periodeAnalisisDanPelaporanData,
        penanggungJawab: indicatorPlans.penanggungJawab,
        createdBy: indicatorPlans.createdBy,
        creatorName: users.name,
        approvedBy: indicatorPlans.approvedBy,
        approvedAt: indicatorPlans.approvedAt,
        rejectedNotes: indicatorPlans.rejectedNotes,
        indicatorId: indicatorPlans.indicatorId,
        createdAt: indicatorPlans.createdAt,
        updatedAt: indicatorPlans.updatedAt,
      })
      .from(indicatorPlans)
      .leftJoin(indicatorCategories, eq(indicatorPlans.indicatorCategoryId, indicatorCategories.id))
      .leftJoin(units, eq(indicatorPlans.unitId, units.id))
      .leftJoin(users, eq(indicatorPlans.createdBy, users.id))
      .where(and(eq(indicatorPlans.id, id), isNull(indicatorPlans.deletedAt)))
      .limit(1)

    if (!plan) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Usulan perencanaan tidak ditemukan' }
    }

    // Role-based visibility check
    if (user.role !== 'admin' && user.role !== 'auditor') {
      // Need to find user's unit
      let userUnitId = user.unitId
      if (!userUnitId && user.employeeId) {
        const [emp] = await db
          .select({ unitId: units.id })
          .from(units)
          .innerJoin(employees, eq(employees.unitId, units.id))
          .where(eq(employees.id, user.employeeId))
          .limit(1)
        if (emp) userUnitId = emp.unitId
      }

      if (plan.unitId !== userUnitId) {
        setResponseStatus(event, 403)
        return { success: false, message: 'Forbidden' }
      }
    }

    return {
      success: true,
      data: plan,
    }
  } catch (error: any) {
    console.error('Error fetching indicator plan detail:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator plan detail',
    }
  }
})
// Import employees if needed since it's referenced in role-based check
import { employees } from '../../database/schema'
