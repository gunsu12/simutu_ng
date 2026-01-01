import { db } from '../../database'
import { units } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const newUnit = await db.insert(units).values({
      unitCode: body.unitCode,
      divisionId: body.divisionId,
      name: body.name,
      description: body.description || null,
      location: body.location || null,
      headOfUnit: body.headOfUnit || null,
    }).returning()
    
    return {
      success: true,
      data: newUnit[0],
      message: 'Unit created successfully',
    }
  } catch (error: any) {
    console.error('Create unit error:', error)
    return {
      success: false,
      message: error.message || 'Failed to create unit',
    }
  }
})
