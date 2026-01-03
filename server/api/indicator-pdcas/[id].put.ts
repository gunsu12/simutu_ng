import { db } from '../../database'
import { indicatorPdcas } from '../../database/schema'
import { eq, isNull, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const id = event.context.params?.id
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'PDCA ID is required',
      })
    }

    const body = await readBody(event)

    // Check if PDCA exists
    const [existing] = await db
      .select()
      .from(indicatorPdcas)
      .where(
        and(
          eq(indicatorPdcas.id, id),
          isNull(indicatorPdcas.deletedAt)
        )
      )

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'PDCA not found',
      })
    }

    // Update PDCA
    const [updated] = await db
      .update(indicatorPdcas)
      .set({
        pdcaDate: body.pdcaDate ? new Date(body.pdcaDate) : existing.pdcaDate,
        problemTitle: body.problemTitle ?? existing.problemTitle,
        stepDescription: body.stepDescription ?? existing.stepDescription,
        planDescription: body.planDescription ?? existing.planDescription,
        doDescription: body.doDescription ?? existing.doDescription,
        checkStudy: body.checkStudy ?? existing.checkStudy,
        action: body.action ?? existing.action,
        updatedAt: new Date(),
      })
      .where(eq(indicatorPdcas.id, id))
      .returning()

    return {
      success: true,
      data: updated,
      message: 'PDCA updated successfully',
    }
  } catch (error: any) {
    console.error('Update PDCA error:', error)
    return {
      success: false,
      message: error.message || 'Failed to update PDCA',
    }
  }
})
