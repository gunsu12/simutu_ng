import { lucia } from '../../utils/auth'
import { db } from '../../database'
import { employees } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getCookie(event, lucia.sessionCookieName)

    if (!sessionId) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Not authenticated',
        data: null,
      }
    }

    const { session, user } = await lucia.validateSession(sessionId)

    if (!session) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Session expired',
        data: null,
      }
    }

    // Refresh session if needed
    if (session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id)
      setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }

    // Fetch employee's unitId if employeeId exists
    let unitId = null
    if (user.employeeId) {
      const employee = await db
        .select({ unitId: employees.unitId })
        .from(employees)
        .where(eq(employees.id, user.employeeId))
        .limit(1)
      
      if (employee.length > 0) {
        unitId = employee[0].unitId
      }
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          siteId: user.siteId,
          unitId: unitId,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
    }
  } catch (error: any) {
    console.error('Session error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to get session',
      data: null,
    }
  }
})
