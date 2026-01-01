import { db } from '../../database'
import { divisions } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const newDivision = await db.insert(divisions).values({
      code: body.code,
      name: body.name,
      description: body.description || null,
    }).returning()
    
    return {
      success: true,
      data: newDivision[0],
      message: 'Division created successfully',
    }
  } catch (error: any) {
    console.error('Create division error:', error)
    return {
      success: false,
      message: error.message || 'Failed to create division',
    }
  }
})
