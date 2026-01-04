import { lucia } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = event.path

  // Skip auth for login endpoint and public routes
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/session' ||
    path.startsWith('/_nuxt') ||
    path.startsWith('/api/_') ||
    !path.startsWith('/api/')
  ) {
    return
  }

  const sessionId = getCookie(event, lucia.sessionCookieName)

  if (!sessionId) {
    setResponseStatus(event, 401)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        success: false,
        message: 'Unauthorized: No session found'
      }
    })
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (!session || !user) {
    setResponseStatus(event, 401)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        success: false,
        message: 'Unauthorized: Session expired'
      }
    })
  }

  // Attach user to event context for use in API handlers
  event.context.user = user
  event.context.session = session

  // Refresh session if needed
  if (session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id)
    setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
  }
})
