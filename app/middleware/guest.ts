export default defineNuxtRouteMiddleware(async (to) => {
    // Skip middleware on server-side
    if (import.meta.server) return

    const { user, fetchSession } = useAuth()

    // If user is not loaded, try to fetch session
    if (!user.value) {
        await fetchSession()
    }

    // If user is logged in, redirect to dashboard
    if (user.value) {
        return navigateTo('/dashboard')
    }
})
