import { lucia } from '../../utils/auth'
import { db } from '../../database'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const { email, password } = await readBody(event)

    if (!email || !password) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Email and password are required',
      }
    }

    // Find user by email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length === 0) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Invalid email or password',
      }
    }

    const user = existingUser[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Invalid email or password',
      }
    }

    // Create session
    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)

    setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    // Log login activity
    await logActivity({
      event,
      action: 'LOGIN',
      module: 'auth',
      description: `User ${user.name} (${user.email}) berhasil login`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    })

    return {
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    }
  } catch (error: any) {
    console.error('Login error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to login',
    }
  }
})
