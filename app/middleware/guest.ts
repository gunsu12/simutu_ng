import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
    // Skip middleware on server-side
    if (import.meta.server) return

    const authStore = useAuthStore()
    const { user } = useAuth()

    // If user is not loaded, try to fetch session
    if (!authStore.user) {
        await authStore.fetchSession()
    }

    // If user is logged in, redirect to dashboard
    if (user.value) {
        return navigateTo('/dashboard')
    }
})
