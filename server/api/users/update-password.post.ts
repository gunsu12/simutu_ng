import { db } from '../../database'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { logActivity } from '../../utils/activityLogger'
import { applyRateLimit, loginRateLimiter } from '../../utils/rateLimiter'

/**
 * Update password endpoint with rate limiting
 * Uses same rate limit as login: 5 attempts per 15 minutes
 */
export default defineEventHandler(async (event) => {
  try {
    // Apply rate limiting to prevent brute force attacks
    await applyRateLimit(event, loginRateLimiter)
    
    const { currentPassword, newPassword, confirmPassword } = await readBody(event)

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Current password, new password, and confirmation are required',
      }
    }

    if (newPassword !== confirmPassword) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'New passwords do not match',
      }
    }

    if (newPassword.length < 6) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'New password must be at least 6 characters',
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

    const user = userRecord[0]

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password)

    if (!validPassword) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Current password is incorrect',
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'settings',
      description: `User mengubah password`,
      details: { userId: session.user.id }
    })

    return {
      success: true,
      message: 'Password updated successfully',
    }
  } catch (error: any) {
    console.error('Update password error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update password',
    }
  }
})
