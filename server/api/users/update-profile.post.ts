import { db } from '../../database'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const { name, email } = await readBody(event)

    // Validate input
    if (!name || !email) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Name and email are required',
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Invalid email format',
      }
    }

    // Get current user
    const session = await lucia.validateSession((await requireAuth(event)).sessionId)
    if (!session.user) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Unauthorized',
      }
    }

    // Get user from database
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (userRecord.length === 0) {
      setResponseStatus(event, 404)
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Check if email is already taken by another user
    if (email !== userRecord[0].email) {
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingEmail.length > 0) {
        setResponseStatus(event, 400)
        return {
          success: false,
          message: 'Email is already in use',
        }
      }
    }

    // Update profile
    const updatedUser = await db
      .update(users)
      .set({
        name,
        email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning()

    if (updatedUser.length === 0) {
      setResponseStatus(event, 500)
      return {
        success: false,
        message: 'Failed to update profile',
      }
    }

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'settings',
      description: `User mengupdate profil: ${updatedUser[0].name}`,
      details: { userId: updatedUser[0].id, name: updatedUser[0].name, email: updatedUser[0].email }
    })

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email,
        username: updatedUser[0].username,
        role: updatedUser[0].role,
      },
    }
  } catch (error: any) {
    console.error('Update profile error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update profile',
    }
  }
})
