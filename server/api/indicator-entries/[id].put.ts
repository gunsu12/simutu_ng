import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems } from '../../database/schema'
import { eq, isNull, and, inArray } from 'drizzle-orm'

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
      .where(
        and(
          eq(indicatorEntries.id, id),
          isNull(indicatorEntries.deletedAt)
        )
      )
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

      // Fetch indicators to evaluate PDCA need based on provided result
      const indicatorIds = items.map((it: any) => it.indicatorId).filter(Boolean)
      const indicatorsMap: Record<string, any> = {}
      if (indicatorIds.length > 0) {
        const { indicators: indicatorsTable } = await import('../../database/schema')
        const fetchedIndicators = await db
          .select({ indicator: indicatorsTable })
          .from(indicatorsTable)
          .where(inArray(indicatorsTable.id, indicatorIds as any))

        fetchedIndicators.forEach(({ indicator }: any) => {
          indicatorsMap[indicator.id] = indicator
        })
      }

      // Ensure we trust frontend-provided numeratorDenominatorResult but compute isNeedPDCA here
      const itemsToInsert = items.map((item: any) => {
        const ind = indicatorsMap[item.indicatorId]
        const providedResult = item.numeratorDenominatorResult !== undefined && item.numeratorDenominatorResult !== null && item.numeratorDenominatorResult !== ''
          ? Number(item.numeratorDenominatorResult)
          : null

        let needPdca = false
        if (providedResult !== null && ind && ind.target !== null && ind.target !== undefined) {
          const target = Number(ind.target)
          const keterangan = ind.targetKeterangan || '>='
          let achieved = false
          switch (keterangan) {
            case '>':
              achieved = providedResult > target
              break
            case '<':
              achieved = providedResult < target
              break
            case '=':
              achieved = providedResult === target
              break
            case '<=':
              achieved = providedResult <= target
              break
            case '>=':
            default:
              achieved = providedResult >= target
              break
          }
          needPdca = !achieved
        }

        return {
          indicatorEntryId: id,
          indicatorId: item.indicatorId,
          numeratorValue: item.numeratorValue?.toString() || null,
          denominatorValue: item.denominatorValue?.toString() || null,
          skor: item.skor?.toString() || null,
          numeratorDenominatorResult: providedResult !== null ? providedResult.toString() : null,
          isAlreadyChecked: item.isAlreadyChecked || false,
          isNeedPDCA: !!needPdca,
          notes: item.notes || null,
        }
      })

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
