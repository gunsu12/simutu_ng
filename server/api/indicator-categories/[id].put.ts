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

    const body = await readBody(event)
    const { name, description } = body

    if (!name || name.trim() === '') {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Name is required',
      }
    }

    const [category] = await db
      .update(indicatorCategories)
      .set({
        name: name.trim(),
        description: description && description.trim() !== '' ? description.trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(indicatorCategories.id, id))
      .returning()

    if (!category) {
      setResponseStatus(event, 404)
      return {
        success: false,
        message: 'Indicator category not found',
      }
    }

    return {
      success: true,
      message: 'Indicator category updated successfully',
      data: category,
    }
  } catch (error: any) {
    console.error('Error updating indicator category:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update indicator category',
    }
  }
})
