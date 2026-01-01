import { db } from '../../database'
import { indicatorUnits } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      return {
        success: false,
        message: 'ID is required',
      }
    }

    await db.delete(indicatorUnits).where(eq(indicatorUnits.id, id))

    return {
      success: true,
      message: 'Unit removed from indicator successfully',
    }
  } catch (error: any) {
    console.error('Delete indicator unit error:', error)
    return {
      success: false,
      message: error.message || 'Failed to remove unit from indicator',
    }
  }
})
