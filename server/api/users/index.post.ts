import { db } from '../../database'
import { users } from '../../database/schema'
import bcrypt from 'bcrypt'
import { logActivity } from '../../utils/activityLogger'
import { sanitizeUserResponse } from '../../utils/validation'
import { applyRateLimit, apiRateLimiter } from '../../utils/rateLimiter'

/**
 * User creation endpoint with rate limiting
 * Rate limit: 100 requests per minute per IP
 */
export default defineEventHandler(async (event) => {
  try {
    // Apply rate limiting to prevent spam account creation
    await applyRateLimit(event, apiRateLimiter)
    
    const body = await readBody(event)

    const { name, username, email, password, role, employeeId, siteId } = body

    if (!name || !username || !email || !password) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Name, username, email, and password are required',
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await db
      .insert(users)
      .values({
        name,
        username,
        email,
        password: hashedPassword,
        role: role || 'user',
        employeeId: employeeId && employeeId.trim() !== '' ? employeeId : null,
        siteId: siteId && siteId.trim() !== '' ? siteId : null,
      })
      .returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'users',
      description: `Membuat user baru: ${name} (${email})`,
      details: { userId: newUser[0].id, name, email, role: role || 'user' }
    })

    setResponseStatus(event, 201)
    return {
      success: true,
      data: sanitizeUserResponse(newUser[0]),
    }
  } catch (error: any) {
    console.error('Error creating user:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to create user',
    }
  }
})
