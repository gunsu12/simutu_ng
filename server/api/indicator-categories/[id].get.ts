import { db } from '../../database'
import { indicatorCategories } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'ID is required',
      }
    }

    const [category] = await db
      .select()
      .from(indicatorCategories)
      .where(eq(indicatorCategories.id, id))
      .limit(1)

    if (!category) {
      setResponseStatus(event, 404)
      return {
        success: false,
        message: 'Indicator category not found',
      }
    }

    return {
      success: true,
      data: category,
    }
  } catch (error: any) {
    console.error('Error fetching indicator category:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch indicator category',
    }
  }
})
