import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems } from '../../database/schema'
import { eq, desc, and, like } from 'drizzle-orm'

// Generate entry code in format NM/YYYYMMDD/0000X
async function generateEntryCode(entryDate: Date): Promise<string> {
  const year = entryDate.getFullYear()
  const month = String(entryDate.getMonth() + 1).padStart(2, '0')
  const day = String(entryDate.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  
  // Find the last entry code for this date
  const lastEntry = await db
    .select()
    .from(indicatorEntries)
    .where(like(indicatorEntries.entryCode, `NM/${dateStr}/%`))
    .orderBy(desc(indicatorEntries.entryCode))
    .limit(1)

  let nextNumber = 1
  if (lastEntry.length > 0) {
    const lastCode = lastEntry[0].entryCode
    const lastNumber = parseInt(lastCode.split('/')[2]) || 0
    nextNumber = lastNumber + 1
  }

  const incrementalNumber = String(nextNumber).padStart(5, '0')
  return `NM/${dateStr}/${incrementalNumber}`
}

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
    return {
      success: false,
      message: error.message || 'Failed to create indicator entry',
    }
  }
})
