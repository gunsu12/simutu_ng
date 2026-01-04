import { db } from '../../database'
import { divisions } from '../../database/schema'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const newDivision = await db.insert(divisions).values({
      siteId: body.siteId,
      code: body.code,
      name: body.name,
      description: body.description || null,
    }).returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'divisions',
      description: `Membuat divisi baru: ${newDivision[0].name} (${newDivision[0].code})`,
      details: { divisionId: newDivision[0].id, code: newDivision[0].code, name: newDivision[0].name }
    })
    
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
