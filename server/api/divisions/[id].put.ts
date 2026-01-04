import { db } from '../../database'
import { divisions } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!id) {
      return {
        success: false,
        message: 'Division ID is required',
      }
    }
    
    const updatedDivision = await db
      .update(divisions)
      .set({
        siteId: body.siteId,
        code: body.code,
        name: body.name,
        description: body.description || null,
        updatedAt: new Date(),
      })
      .where(eq(divisions.id, id))
      .returning()
    
    if (updatedDivision.length === 0) {
      return {
        success: false,
        message: 'Division not found',
      }
    }

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'divisions',
      description: `Mengupdate divisi: ${updatedDivision[0].name} (${updatedDivision[0].code})`,
      details: { divisionId: id, code: updatedDivision[0].code, name: updatedDivision[0].name }
    })
    
    return {
      success: true,
      data: updatedDivision[0],
      message: 'Division updated successfully',
    }
  } catch (error: any) {
    console.error('Update division error:', error)
    return {
      success: false,
      message: error.message || 'Failed to update division',
    }
  }
})
