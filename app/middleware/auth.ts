export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server-side
  if (import.meta.server) return

  const { user, fetchSession } = useAuth()

  // If user is not loaded, try to fetch session
  if (!user.value) {
    const hasSession = await fetchSession()
    
    if (!hasSession) {
      return navigateTo('/login')
    }
  }
})
