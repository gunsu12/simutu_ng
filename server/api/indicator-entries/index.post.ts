import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems } from '../../database/schema'
import { eq, desc, and, like, sql, isNull, inArray } from 'drizzle-orm'
import { generateEntryCode } from '../../services/indicatorService'

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
 
    const body = await readBody(event)
    
    const {
      unitId,
      entryDate,
      entryFrequency,
      notes,
      status = 'proposed',
      items, // Array of { indicatorId, numeratorValue, denominatorValue, skor, notes }
    } = body

    if (!unitId || !entryDate || !entryFrequency || !items || items.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields',
      })
    }

    // Check for existing entry based on frequency
    const entryDateStr = typeof entryDate === 'string' ? entryDate : new Date(entryDate).toISOString()
    
    if (entryFrequency === 'daily') {
      // For daily entries, check for the same exact day
      const existingEntries = await db
        .select()
        .from(indicatorEntries)
        .where(
          and(
            eq(indicatorEntries.unitId, unitId),
            eq(indicatorEntries.entryFrequency, 'daily'),
            sql`DATE(${indicatorEntries.entryDate}) = DATE(${entryDateStr}::timestamp)`,
            isNull(indicatorEntries.deletedAt)
          )
        )
        .limit(1)
      
      if (existingEntries.length > 0) {
        throw createError({
          statusCode: 400,
          message: 'An entry for this unit, date, and frequency already exists on this day',
        })
      }
    } else if (entryFrequency === 'monthly') {
      // For monthly entries, check for the same month and year
      const existingEntries = await db
        .select()
        .from(indicatorEntries)
        .where(
          and(
            eq(indicatorEntries.unitId, unitId),
            eq(indicatorEntries.entryFrequency, 'monthly'),
            sql`DATE_TRUNC('month', ${indicatorEntries.entryDate}) = DATE_TRUNC('month', ${entryDateStr}::timestamp)`,
            isNull(indicatorEntries.deletedAt)
          )
        )
        .limit(1)
      
      if (existingEntries.length > 0) {
        throw createError({
          statusCode: 400,
          message: 'An entry for this unit, month, and frequency already exists',
        })
      }
    }

    // Use numeratorDenominatorResult calculated on frontend (do not recalculate here)
    // but still determine whether PDCA is needed by comparing the provided result
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

    for (const it of items) {
      const ind = indicatorsMap[it.indicatorId]
      const providedResult = it.numeratorDenominatorResult !== undefined && it.numeratorDenominatorResult !== null && it.numeratorDenominatorResult !== ''
        ? Number(it.numeratorDenominatorResult)
        : null

      // Determine whether PDCA is needed by comparing provided result against indicator target
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

      // Ensure we use frontend-provided result and set PDCA flag
      it.numeratorDenominatorResult = providedResult
      it.isNeedPDCA = !!needPdca
    }

    // Generate entry code
    const entryCode = await generateEntryCode(new Date(entryDate))

    // Create indicator entry
    const [newEntry] = await db.insert(indicatorEntries).values({
      entryCode,
      unitId,
      entryDate: new Date(entryDate),
      entryFrequency,
      notes: notes || null,
      status,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning()

    // Create indicator entry items
    const itemsToInsert = items.map((item: any) => ({
      indicatorEntryId: newEntry.id,
      indicatorId: item.indicatorId,
      numeratorValue: item.numeratorValue?.toString() || null,
      denominatorValue: item.denominatorValue?.toString() || null,
      skor: item.skor?.toString() || null,
      numeratorDenominatorResult: item.numeratorDenominatorResult?.toString() || null,
      isAlreadyChecked: item.isAlreadyChecked || false,
      isNeedPDCA: item.isNeedPDCA || false,
      notes: item.notes || null,
    }))

    const insertedItems = await db.insert(indicatorEntryItems).values(itemsToInsert).returning()

    return {
      success: true,
      data: {
        ...newEntry,
        items: insertedItems,
      },
      message: 'Indicator entry created successfully',
    }
  } catch (error: any) {
    console.error('Create indicator entry error:', error)
    
    // If it's already a createError, rethrow it to let h3 handle the response
    if (error.statusCode) {
      throw error
    }
    
    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create indicator entry',
    })
  }
})
