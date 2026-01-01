import { db } from '../../database'
import { units } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!id) {
      return {
        success: false,
        message: 'Unit ID is required',
      }
    }
    
    const updatedUnit = await db
      .update(units)
      .set({
        unitCode: body.unitCode,
        divisionId: body.divisionId,
        name: body.name,
        description: body.description || null,
        location: body.location || null,
        headOfUnit: body.headOfUnit || null,
        updatedAt: new Date(),
      })
      .where(eq(units.id, id))
      .returning()
    
    if (updatedUnit.length === 0) {
      return {
        success: false,
        message: 'Unit not found',
      }
    }
    
    return {
      success: true,
      data: updatedUnit[0],
      message: 'Unit updated successfully',
    }
  } catch (error: any) {
    console.error('Update unit error:', error)
    return {
      success: false,
      message: error.message || 'Failed to update unit',
    }
  }
})
