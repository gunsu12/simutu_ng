import { db } from '../../database'
import { indicatorEntries } from '../../database/schema'
import { eq } from 'drizzle-orm'

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
        message: 'Entry ID is required',
      })
    }

    // Soft delete by setting deletedAt timestamp
    const [deletedEntry] = await db
      .update(indicatorEntries)
      .set({ deletedAt: new Date() })
      .where(eq(indicatorEntries.id, id))
      .returning()

    if (!deletedEntry) {
      throw createError({
        statusCode: 404,
        message: 'Entry not found',
      })
    }

    return {
      success: true,
      message: 'Indicator entry deleted successfully',
    }
  } catch (error: any) {
    console.error('Delete indicator entry error:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete indicator entry',
    }
  }
})
