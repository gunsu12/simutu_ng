import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
    const authStore = useAuthStore()
    const { refresh } = useAuth()

    const api = $fetch.create({
        baseURL: '/api', // Your API base URL

        async onRequest({ options }) {
            // Add Authorization header with JWT
            const token = authStore.tokens?.accessToken
            if (token) {
                options.headers = {
                    ...options.headers as any,
                    Authorization: `Bearer ${token}`,
                }
            }
        },

        async onResponseError({ response }) {
            // Auto-refresh on 401
            if (response.status === 401) {
                try {
                    await refresh()
                    // Retry the request with new token
                    // (Note: you might want to implement retry logic here)
                } catch (error) {
                    console.error('Auto-refresh failed:', error)
                }
            }
        },
    })

    return {
        provide: {
            api,
        },
    }
})
