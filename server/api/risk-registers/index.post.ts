import { db } from '../../database'
import { riskRegisters, units } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
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

    // Determine unit and site
    let targetUnitId = unitId
    if (user.role !== 'admin' && user.role !== 'auditor') {
      targetUnitId = user.unitId
    }

    if (!targetUnitId) {
      setResponseStatus(event, 400)
      return { success: false, message: 'Unit wajib ditentukan' }
    }

    // Fetch siteId from unit
    const [unit] = await db
      .select({ siteId: units.siteId, name: units.name })
      .from(units)
      .where(eq(units.id, targetUnitId))
      .limit(1)

    if (!unit) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Unit tidak ditemukan' }
    }

    const [newRisk] = await db
      .insert(riskRegisters)
      .values({
        siteId: unit.siteId,
        unitId: targetUnitId,
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
        status: 'proposed',
        createdBy: user.id,
      })
      .returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'risk-registers',
      description: `Membuat usulan risk register baru untuk unit ${unit.name}: ${newRisk.risiko}`,
      details: { riskId: newRisk.id }
    })

    return {
      success: true,
      message: 'Usulan risk register berhasil diajukan',
      data: newRisk,
    }
  } catch (error: any) {
    console.error('Error creating risk register:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to create risk register',
    }
  }
})
