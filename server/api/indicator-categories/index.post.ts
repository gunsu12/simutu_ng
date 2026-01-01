import { db } from '../../database'
import { indicatorCategories } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
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
      .insert(indicatorCategories)
      .values({
        name: name.trim(),
        description: description && description.trim() !== '' ? description.trim() : null,
      })
      .returning()

    setResponseStatus(event, 201)
    return {
      success: true,
      message: 'Indicator category created successfully',
      data: category,
    }
  } catch (error: any) {
    console.error('Error creating indicator category:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to create indicator category',
    }
  }
})
