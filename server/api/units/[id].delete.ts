import { db } from '../../database'
import { units } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        message: 'Unit ID is required',
      }
    }
    
    await db.update(units).set({ deletedAt: new Date() }).where(eq(units.id, id))

    await logActivity({
      event,
      action: 'DELETE',
      module: 'units',
      description: `Menghapus unit dengan ID: ${id}`,
      details: { unitId: id }
    })
    
    return {
      success: true,
      message: 'Unit deleted successfully',
    }
  } catch (error: any) {
    console.error('Delete unit error:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete unit',
    }
  }
})
