import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'User not found',
      })
    }

    const id = event.context.params?.id
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Entry ID is required',
      })
    }

    const body = await readBody(event)
    
    const {
      entryDate,
      entryFrequency,
      notes,
      status,
      auditorNotes,
      items, // Array of { id?, indicatorId, numeratorValue, denominatorValue, skor, notes }
    } = body

    // Update indicator entry
    const updateData: any = {
      updatedBy: user.id,
      updatedAt: new Date(),
    }

    if (entryDate) updateData.entryDate = new Date(entryDate)
    if (entryFrequency) updateData.entryFrequency = entryFrequency
    if (notes !== undefined) updateData.notes = notes
    if (status) updateData.status = status
    if (auditorNotes !== undefined) updateData.auditorNotes = auditorNotes

    const [updatedEntry] = await db
      .update(indicatorEntries)
      .set(updateData)
      .where(eq(indicatorEntries.id, id))
      .returning()

    if (!updatedEntry) {
      throw createError({
        statusCode: 404,
        message: 'Entry not found',
      })
    }

    // Update items if provided
    if (items && items.length > 0) {
      // Delete existing items
      await db.delete(indicatorEntryItems).where(eq(indicatorEntryItems.indicatorEntryId, id))

      // Insert new items
      const itemsToInsert = items.map((item: any) => ({
        indicatorEntryId: id,
        indicatorId: item.indicatorId,
        numeratorValue: item.numeratorValue?.toString() || null,
        denominatorValue: item.denominatorValue?.toString() || null,
        skor: item.skor?.toString() || null,
        numeratorDenominatorResult: item.numeratorDenominatorResult?.toString() || null,
        isAlreadyChecked: item.isAlreadyChecked || false,
        isNeedPDCA: item.isNeedPDCA || false,
        notes: item.notes || null,
      }))

      await db.insert(indicatorEntryItems).values(itemsToInsert)
    }

    return {
      success: true,
      data: updatedEntry,
      message: 'Indicator entry updated successfully',
    }
  } catch (error: any) {
    console.error('Update indicator entry error:', error)
    return {
      success: false,
      message: error.message || 'Failed to update indicator entry',
    }
  }
})
