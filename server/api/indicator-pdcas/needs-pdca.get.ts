import { db } from '../../database'
import { indicatorEntryItems, indicators, indicatorEntries, units, indicatorPdcas } from '../../database/schema'
import { eq, isNull, and, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    // Get indicator entry items that need PDCA (isNeedPDCA = true)
    const items = await db
      .select({
        entryItem: indicatorEntryItems,
        indicator: indicators,
        entry: indicatorEntries,
        unit: units,
      })
      .from(indicatorEntryItems)
      .innerJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
      .innerJoin(indicatorEntries, eq(indicatorEntryItems.indicatorEntryId, indicatorEntries.id))
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .where(
        and(
          eq(indicatorEntryItems.isNeedPDCA, true),
          isNull(indicatorEntries.deletedAt)
        )
      )
      .orderBy(desc(indicatorEntries.entryDate))

    // Get existing PDCAs for these items to mark which ones already have PDCA
    const itemIds = items.map(item => item.entryItem.id)
    
    let existingPdcaMap: Record<string, boolean> = {}
    if (itemIds.length > 0) {
      const existingPdcas = await db
        .select({
          entryItemId: indicatorPdcas.entryItemId,
        })
        .from(indicatorPdcas)
        .where(
          and(
            sql`${indicatorPdcas.entryItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`,
            isNull(indicatorPdcas.deletedAt)
          )
        )
      
      existingPdcaMap = existingPdcas.reduce((acc, pdca) => {
        acc[pdca.entryItemId] = true
        return acc
      }, {} as Record<string, boolean>)
    }

    return {
      success: true,
      data: items.map(({ entryItem, indicator, entry, unit }) => ({
        ...entryItem,
        indicator,
        entry: {
          id: entry.id,
          entryCode: entry.entryCode,
          entryDate: entry.entryDate,
          status: entry.status,
        },
        unit: unit ? {
          id: unit.id,
          name: unit.name,
          unitCode: unit.unitCode,
        } : null,
        hasPdca: existingPdcaMap[entryItem.id] || false,
      })),
    }
  } catch (error: any) {
    console.error('Fetch PDCA needs error:', error)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator entries needing PDCA',
    }
  }
})
