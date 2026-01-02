import { db } from '../../database'
import { indicators } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'ID is required',
      }
    }

    const body = await readBody(event)
    const {
      indicatorCategoryId,
      code,
      judul,
      dimensiMutu,
      tujuan,
      definisiOperasional,
      formula,
      numerator,
      denominator,
      target,
      targetWeight,
      targetUnit,
      targetKeterangan,
      targetIsZero,
      targetCalculationFormula,
      documentFile,
      entryFrequency,
      isActive,
    } = body

    if (!indicatorCategoryId || !code || !judul) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Category, code, and judul are required',
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    updateData.indicatorCategoryId = indicatorCategoryId.trim()
    updateData.code = code.trim()
    updateData.judul = judul.trim()
    updateData.dimensiMutu = dimensiMutu && dimensiMutu.trim() !== '' ? dimensiMutu.trim() : null
    updateData.tujuan = tujuan && tujuan.trim() !== '' ? tujuan.trim() : null
    updateData.definisiOperasional = definisiOperasional && definisiOperasional.trim() !== '' ? definisiOperasional.trim() : null
    updateData.formula = formula && formula.trim() !== '' ? formula.trim() : null
    updateData.numerator = numerator && numerator.trim() !== '' ? numerator.trim() : null
    updateData.denominator = denominator && denominator.trim() !== '' ? denominator.trim() : null
    updateData.target = target || null
    if (targetWeight !== undefined) updateData.targetWeight = Number(targetWeight)
    updateData.targetUnit = targetUnit && targetUnit.trim() !== '' ? targetUnit.trim() : null
    updateData.targetKeterangan = targetKeterangan && targetKeterangan.trim() !== '' ? targetKeterangan.trim() : null
    updateData.targetIsZero = targetIsZero || false
    updateData.targetCalculationFormula = targetCalculationFormula && targetCalculationFormula.trim() !== '' ? targetCalculationFormula.trim() : null
    updateData.documentFile = documentFile && documentFile.trim() !== '' ? documentFile.trim() : null
    updateData.entryFrequency = entryFrequency || 'monthly'
    updateData.isActive = isActive !== undefined ? isActive : true

    const [indicator] = await db
      .update(indicators)
      .set(updateData)
      .where(eq(indicators.id, id))
      .returning()

    if (!indicator) {
      setResponseStatus(event, 404)
      return {
        success: false,
        message: 'Indicator not found',
      }
    }

    return {
      success: true,
      message: 'Indicator updated successfully',
      data: indicator,
    }
  } catch (error: any) {
    console.error('Error updating indicator:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update indicator',
    }
  }
})
