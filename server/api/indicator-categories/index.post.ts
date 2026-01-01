import { db } from '../../database'
import { indicatorCategories } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    
    if (!user) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Unauthorized',
      }
    }

    const body = await readBody(event)
    const { name, description, siteId } = body

    if (!name || name.trim() === '') {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Name is required',
      }
    }

    // Determine which siteId to use
    let targetSiteId: string
    
    if (user.role === 'admin') {
      // Admin can specify siteId or use their own
      targetSiteId = siteId || user.siteId
      if (!targetSiteId) {
        setResponseStatus(event, 400)
        return {
          success: false,
          message: 'Site ID is required',
        }
      }
    } else {
      // Regular users can only create for their own site
      if (!user.siteId) {
        setResponseStatus(event, 403)
        return {
          success: false,
          message: 'User must be assigned to a site',
        }
      }
      targetSiteId = user.siteId
    }

    const [category] = await db
      .insert(indicatorCategories)
      .values({
        siteId: targetSiteId,
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
