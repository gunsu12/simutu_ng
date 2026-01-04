import { db } from '../../database'
import { indicatorPdcas, indicatorEntryItems } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const body = await readBody(event)
    
    // Validate required fields
    if (!body.entryItemId) {
      throw createError({
        statusCode: 400,
        message: 'Entry Item ID is required',
      })
    }
    
    if (!body.pdcaDate) {
      throw createError({
        statusCode: 400,
        message: 'PDCA Date is required',
      })
    }
    
    if (!body.problemTitle) {
      throw createError({
        statusCode: 400,
        message: 'Problem Title is required',
      })
    }

    // Verify entry item exists and needs PDCA
    const [entryItem] = await db
      .select()
      .from(indicatorEntryItems)
      .where(eq(indicatorEntryItems.id, body.entryItemId))

    if (!entryItem) {
      throw createError({
        statusCode: 404,
        message: 'Indicator entry item not found',
      })
    }

    // Create PDCA entry
    const [newPdca] = await db
      .insert(indicatorPdcas)
      .values({
        entryItemId: body.entryItemId,
        pdcaDate: new Date(body.pdcaDate),
        problemTitle: body.problemTitle,
        stepDescription: body.stepDescription || null,
        planDescription: body.planDescription || null,
        doDescription: body.doDescription || null,
        checkStudy: body.checkStudy || null,
        action: body.action || null,
        createdBy: session.userId,
      })
      .returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'indicator-pdcas',
      description: `Membuat PDCA baru: ${body.problemTitle}`,
      details: { pdcaId: newPdca.id, problemTitle: body.problemTitle, entryItemId: body.entryItemId }
    })

    return {
      success: true,
      data: newPdca,
      message: 'PDCA entry created successfully',
    }
  } catch (error: any) {
    console.error('Create PDCA error:', error)
    return {
      success: false,
      message: error.message || 'Failed to create PDCA entry',
    }
  }
})
