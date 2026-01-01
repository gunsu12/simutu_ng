import { db } from '../../database'
import { divisions } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const allDivisions = await db.select().from(divisions).orderBy(divisions.createdAt)
    
    return {
      success: true,
      data: allDivisions,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch divisions',
    }
  }
})
