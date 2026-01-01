import { db } from '../../database'
import { divisions, sites } from '../../database/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const { siteId } = getQuery(event)
    const conditions = []
    
    if (siteId && siteId !== '') {
      conditions.push(eq(divisions.siteId, siteId as string))
    }

    const allDivisions = await db
      .select({
        id: divisions.id,
        siteId: divisions.siteId,
        code: divisions.code,
        name: divisions.name,
        description: divisions.description,
        createdAt: divisions.createdAt,
        updatedAt: divisions.updatedAt,
        siteName: sites.name,
      })
      .from(divisions)
      .leftJoin(sites, eq(divisions.siteId, sites.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(divisions.createdAt)
    
    return {
      success: true,
      data: allDivisions,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch divisions',
    }
  }
})
