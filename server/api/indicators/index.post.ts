import { db } from '../../database'
import { indicators } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
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
      targetUnit,
      targetKeterangan,
      targetIsZero,
      targetCalculationFormula,
      documentFile,
    } = body

    if (!indicatorCategoryId || !code || !judul) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Category, code, and judul are required',
      }
    }

    const [indicator] = await db
      .insert(indicators)
      .values({
        indicatorCategoryId: indicatorCategoryId.trim(),
        code: code.trim(),
        judul: judul.trim(),
        dimensiMutu: dimensiMutu && dimensiMutu.trim() !== '' ? dimensiMutu.trim() : null,
        tujuan: tujuan && tujuan.trim() !== '' ? tujuan.trim() : null,
        definisiOperasional: definisiOperasional && definisiOperasional.trim() !== '' ? definisiOperasional.trim() : null,
        formula: formula && formula.trim() !== '' ? formula.trim() : null,
        numerator: numerator && numerator.trim() !== '' ? numerator.trim() : null,
        denominator: denominator && denominator.trim() !== '' ? denominator.trim() : null,
        target: target || null,
        targetUnit: targetUnit && targetUnit.trim() !== '' ? targetUnit.trim() : null,
        targetKeterangan: targetKeterangan && targetKeterangan.trim() !== '' ? targetKeterangan.trim() : null,
        targetIsZero: targetIsZero || false,
        targetCalculationFormula: targetCalculationFormula && targetCalculationFormula.trim() !== '' ? targetCalculationFormula.trim() : null,
        documentFile: documentFile && documentFile.trim() !== '' ? documentFile.trim() : null,
      })
      .returning()

    setResponseStatus(event, 201)
    return {
      success: true,
      message: 'Indicator created successfully',
      data: indicator,
    }
  } catch (error: any) {
    console.error('Error creating indicator:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to create indicator',
    }
  }
})
