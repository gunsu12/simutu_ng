import { db } from '../../database'
import { divisions } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

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

    await logActivity({
      event,
      action: 'DELETE',
      module: 'divisions',
      description: `Menghapus divisi dengan ID: ${id}`,
      details: { divisionId: id }
    })
    
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
