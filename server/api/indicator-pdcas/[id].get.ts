import { db } from '../../database'
import { indicatorPdcas, indicatorEntryItems, indicators, indicatorEntries, units, users } from '../../database/schema'
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
        message: 'PDCA ID is required',
      })
    }

    const [result] = await db
      .select({
        pdca: indicatorPdcas,
        entryItem: indicatorEntryItems,
        indicator: indicators,
        entry: indicatorEntries,
        unit: units,
        createdByUser: users,
      })
      .from(indicatorPdcas)
      .leftJoin(indicatorEntryItems, eq(indicatorPdcas.entryItemId, indicatorEntryItems.id))
      .leftJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .leftJoin(indicatorEntries, eq(indicatorEntryItems.indicatorEntryId, indicatorEntries.id))
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .leftJoin(users, eq(indicatorPdcas.createdBy, users.id))
      .where(
        and(
          eq(indicatorPdcas.id, id),
          isNull(indicatorPdcas.deletedAt)
        )
      )

    if (!result) {
      throw createError({
        statusCode: 404,
        message: 'PDCA not found',
      })
    }

    return {
      success: true,
      data: {
        ...result.pdca,
        entryItem: result.entryItem ? {
          ...result.entryItem,
          indicator: result.indicator,
        } : null,
        entry: result.entry,
        unit: result.unit,
        createdByUser: result.createdByUser ? {
          id: result.createdByUser.id,
          name: result.createdByUser.name,
        } : null,
      },
    }
  } catch (error: any) {
    console.error('Fetch PDCA error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch PDCA',
    }
  }
})
