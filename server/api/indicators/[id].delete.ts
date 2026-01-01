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

    await db
      .update(indicators)
      .set({ deletedAt: new Date() })
      .where(eq(indicators.id, id))

    return {
      success: true,
      message: 'Indicator deleted successfully',
    }
  } catch (error: any) {
    console.error('Error deleting indicator:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to delete indicator',
    }
  }
})
