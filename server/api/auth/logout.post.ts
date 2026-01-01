import { lucia } from '../../utils/auth'

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
