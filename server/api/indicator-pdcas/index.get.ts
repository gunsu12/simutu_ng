import { db } from '../../database'
import { indicatorPdcas, indicatorEntryItems, indicators, indicatorEntries, units, users } from '../../database/schema'
import { eq, isNull, desc, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const query = getQuery(event)
    const entryItemId = query.entryItemId as string | undefined

    // Build where conditions
    const conditions = [isNull(indicatorPdcas.deletedAt)]
    
    if (entryItemId) {
      conditions.push(eq(indicatorPdcas.entryItemId, entryItemId))
    }

    const pdcaList = await db
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
      .where(and(...conditions))
      .orderBy(desc(indicatorPdcas.createdAt))

    return {
      success: true,
      data: pdcaList.map(({ pdca, entryItem, indicator, entry, unit, createdByUser }) => ({
        ...pdca,
        entryItem: entryItem ? {
          ...entryItem,
          indicator,
        } : null,
        entry,
        unit,
        createdByUser: createdByUser ? {
          id: createdByUser.id,
          name: createdByUser.name,
        } : null,
      })),
    }
  } catch (error: any) {
    console.error('Fetch PDCA list error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch PDCA list',
    }
  }
})
