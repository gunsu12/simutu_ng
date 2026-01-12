import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
    // Skip middleware on server-side
    if (process.server) return

    const authStore = useAuthStore()
    const { ensureValidToken } = useAuth()

    // Restore auth from localStorage on first load
    if (!authStore.isAuthenticated && !authStore.user) {
        authStore.restoreAuth()
    }

    // Public routes that don't require auth
    // Note: '/' is exact match, others are prefix matches
    const publicRoutes = ['/login', '/auth/callback']

    const isPublicRoute =
        to.path === '/' ||
        publicRoutes.some(route => to.path.startsWith(route))

    if (!isPublicRoute) {
        // If not authenticated, TRY to fetch session (legacy support)
        if (!authStore.isAuthenticated) {
            await authStore.fetchSession()
        }

        // Protected route - require authentication
        if (!authStore.isAuthenticated) {
            return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
        }

        // Ensure token is valid (auto-refresh if needed) - only if we have tokens
        if (authStore.tokens) {
            try {
                await ensureValidToken()
            } catch (error) {
                console.error('Token validation failed:', error)
                return navigateTo('/login')
            }
        }
    } else if (to.path === '/login' && authStore.isAuthenticated) {
        // Already authenticated, redirect to dashboard
        return navigateTo('/dashboard')
    }
})
