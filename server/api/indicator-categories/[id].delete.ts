import { db } from '../../database'
import { indicatorCategories } from '../../database/schema'
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
      .delete(indicatorCategories)
      .where(eq(indicatorCategories.id, id))

    return {
      success: true,
      message: 'Indicator category deleted successfully',
    }
  } catch (error: any) {
    console.error('Error deleting indicator category:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to delete indicator category',
    }
  }
})
