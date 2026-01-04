import { db } from '../../database'
import { units } from '../../database/schema'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const newUnit = await db.insert(units).values({
      siteId: body.siteId,
      unitCode: body.unitCode,
      divisionId: body.divisionId,
      name: body.name,
      description: body.description || null,
      location: body.location || null,
      headOfUnit: body.headOfUnit || null,
    }).returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'units',
      description: `Membuat unit baru: ${newUnit[0].name} (${newUnit[0].unitCode})`,
      details: { unitId: newUnit[0].id, unitCode: newUnit[0].unitCode, name: newUnit[0].name }
    })
    
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
