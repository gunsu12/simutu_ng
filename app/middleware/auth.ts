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

  // Check for Master Data access (only admin can access)
  if (to.path.startsWith('/dashboard/master/') || to.path === '/dashboard/master') {
    if (user.value?.role !== 'admin') {
      // Redirect non-admin users to dashboard
      return navigateTo('/dashboard')
    }
  }

  // Check for Mutu Master access (user role cannot access, but manager and auditor can)
  if (to.path.startsWith('/dashboard/mutu/master/')) {
    if (user.value?.role === 'user') {
      // Redirect user role to dashboard
      return navigateTo('/dashboard')
    }
  }
})
