import { db } from '../../database'
import { riskRegisters, units } from '../../database/schema'
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

    // Role-based visibility and edit restrictions
    if (user.role !== 'admin' && user.role !== 'auditor') {
      if (existingRisk.unitId !== user.unitId) {
        setResponseStatus(event, 403)
        return { success: false, message: 'Forbidden' }
      }

      if (existingRisk.status === 'approved') {
        setResponseStatus(event, 400)
        return { success: false, message: 'Risk register yang sudah disetujui tidak dapat diubah' }
      }
    }

    const body = await readBody(event)
    const {
      kategoriRisiko,
      risiko,
      penyebab,
      dampak,
      likelihood,
      severity,
      mitigasi,
      unitId,
      tahun,
    } = body

    if (!kategoriRisiko || !risiko || !penyebab || !dampak || !mitigasi || !tahun) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Semua field termasuk Tahun wajib diisi' }
    }

    const scoreLikelihood = Number(likelihood) || 1
    const scoreSeverity = Number(severity) || 1
    const targetTahun = Number(tahun) || new Date().getFullYear()

    if (scoreLikelihood < 1 || scoreLikelihood > 5 || scoreSeverity < 1 || scoreSeverity > 5) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Likelihood dan Severity harus bernilai 1 sampai 5' }
    }

    // Calculate rating and level
    const riskRating = scoreLikelihood * scoreSeverity
    let levelRisiko = 'Rendah'
    if (riskRating >= 15) {
      levelRisiko = 'Tinggi'
    } else if (riskRating >= 6) {
      levelRisiko = 'Sedang'
    }

    // Update payload
    const updateData: any = {
      tahun: targetTahun,
      kategoriRisiko: kategoriRisiko.trim(),
      risiko: risiko.trim(),
      penyebab: penyebab.trim(),
      dampak: dampak.trim(),
      likelihood: scoreLikelihood,
      severity: scoreSeverity,
      riskRating,
      levelRisiko,
      mitigasi: mitigasi.trim(),
      status: 'proposed', // Reset status to proposed when updated
      updatedAt: new Date(),
    }

    // Admins can update unitId
    if (user.role === 'admin' && unitId && unitId !== existingRisk.unitId) {
      // Fetch siteId from new unit
      const [unit] = await db
        .select({ siteId: units.siteId })
        .from(units)
        .where(eq(units.id, unitId))
        .limit(1)

      if (unit) {
        updateData.unitId = unitId
        updateData.siteId = unit.siteId
      }
    }

    const [updatedRisk] = await db
      .update(riskRegisters)
      .set(updateData)
      .where(eq(riskRegisters.id, id))
      .returning()

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'risk-registers',
      description: `Memperbarui usulan risk register: ${updatedRisk.risiko}`,
      details: { riskId: updatedRisk.id }
    })

    return {
      success: true,
      message: 'Usulan risk register berhasil diperbarui',
      data: updatedRisk,
    }
  } catch (error: any) {
    console.error('Error updating risk register:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update risk register',
    }
  }
})
