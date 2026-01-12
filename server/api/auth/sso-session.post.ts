import { lucia } from '../../utils/auth'
import { db } from '../../database'
import { users } from '../../database/schema'
import { eq, sql } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { email } = body

        if (!email) {
            setResponseStatus(event, 400)
            return {
                success: false,
                message: 'Email is required'
            }
        }

        // Find user by email (case-insensitive)
        const foundUsers = await db
            .select()
            .from(users)
            .where(sql`lower(${users.email}) = lower(${email})`)
            .limit(1)

        if (foundUsers.length === 0) {
            setResponseStatus(event, 404)
            return {
                success: false,
                message: 'User not found'
            }
        }

        const user = foundUsers[0]

        // Create Lucia session (same as traditional login)
        const session = await lucia.createSession(user.id, {})
        const sessionCookie = lucia.createSessionCookie(session.id)

        setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

        // Log activity
        await logActivity({
            event,
            action: 'LOGIN',
            module: 'auth',
            description: `SSO login successful for ${user.email}`,
            details: { email: user.email },
            userId: user.id,
            userName: user.name,
            userEmail: user.email
        })

        return {
            success: true,
            message: 'Session created successfully'
        }
    } catch (error: any) {
        console.error('SSO session creation error:', error)
        setResponseStatus(event, 500)
        return {
            success: false,
            message: error.message || 'Failed to create session'
        }
    }
})
