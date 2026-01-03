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

    // Soft delete
    await db
      .update(indicatorPdcas)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(indicatorPdcas.id, id))

    return {
      success: true,
      message: 'PDCA deleted successfully',
    }
  } catch (error: any) {
    console.error('Delete PDCA error:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete PDCA',
    }
  }
})
