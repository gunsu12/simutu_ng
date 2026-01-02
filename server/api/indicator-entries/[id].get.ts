import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, units } from '../../database/schema'
import { eq, isNull, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const id = event.context.params?.id
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Entry ID is required',
      })
    }

    // Fetch entry with unit
    const [entryData] = await db
      .select({
        entry: indicatorEntries,
        unit: units,
      })
      .from(indicatorEntries)
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .where(
        and(
          eq(indicatorEntries.id, id),
          isNull(indicatorEntries.deletedAt)
        )
      )

    if (!entryData) {
      throw createError({
        statusCode: 404,
        message: 'Entry not found',
      })
    }

    // Fetch items for this entry
    const items = await db
      .select({
        item: indicatorEntryItems,
        indicator: indicators,
      })
      .from(indicatorEntryItems)
      .leftJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .where(eq(indicatorEntryItems.indicatorEntryId, id))

    return {
      success: true,
      data: {
        ...entryData.entry,
        unit: entryData.unit,
        items: items.map(({ item, indicator }) => ({
          ...item,
          indicator,
        })),
      },
    }
  } catch (error: any) {
    console.error('Fetch indicator entry error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator entry',
    }
  }
})
