import { db } from '../../database'
import { divisions } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        message: 'Division ID is required',
      }
    }
    
    await db
      .update(divisions)
      .set({ deletedAt: new Date() })
      .where(eq(divisions.id, id))
    
    return {
      success: true,
      message: 'Division deleted successfully',
    }
  } catch (error: any) {
    console.error('Delete division error:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete division',
    }
  }
})
