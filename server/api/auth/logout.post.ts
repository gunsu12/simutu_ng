import { lucia } from '../../utils/auth'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getCookie(event, lucia.sessionCookieName)

    if (!sessionId) {
      setResponseStatus(event, 401)
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    // Log logout activity before invalidating session
    if (event.context.user) {
      await logActivity({
        event,
        action: 'LOGOUT',
        module: 'auth',
        description: `User ${event.context.user.name} (${event.context.user.email}) logout`,
      })
    }

    await lucia.invalidateSession(sessionId)

    const sessionCookie = lucia.createBlankSessionCookie()
    setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return {
      success: true,
      message: 'Logout successful',
    }
  } catch (error: any) {
    console.error('Logout error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to logout',
    }
  }
})
