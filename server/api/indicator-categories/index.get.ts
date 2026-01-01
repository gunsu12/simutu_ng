import { db } from '../../database'
import { indicatorCategories } from '../../database/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const categories = await db
      .select()
      .from(indicatorCategories)
      .orderBy(asc(indicatorCategories.name))

    return {
      success: true,
      data: categories,
    }
  } catch (error: any) {
    console.error('Error fetching indicator categories:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator categories',
    }
  }
})
