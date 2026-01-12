import { defineStore } from 'pinia'
import type { User, AuthTokens, AuthState } from '~/types/auth'

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
    }),

    getters: {
        isTokenExpired: (state) => {
            if (!state.tokens) return true
            return Date.now() >= state.tokens.expiresAt
        },

        shouldRefreshToken: (state) => {
            if (!state.tokens) return false
            // Refresh 5 minutes before expiry
            return Date.now() >= state.tokens.expiresAt - 5 * 60 * 1000
        },
    },

    actions: {
        /**
         * Set authentication data
         */
        setAuth(user: User, tokens: AuthTokens) {
            this.user = user
            this.tokens = tokens
            this.isAuthenticated = true

            // Save to localStorage for persistence
            if (process.client) {
                localStorage.setItem('auth_user', JSON.stringify(user))
                localStorage.setItem('auth_tokens', JSON.stringify(tokens))
            }
        },

        /**
         * Clear authentication data
         */
        clearAuth() {
            this.user = null
            this.tokens = null
            this.isAuthenticated = false

            if (process.client) {
                localStorage.removeItem('auth_user')
                localStorage.removeItem('auth_tokens')
            }
        },

        /**
         * Restore auth from localStorage
         */
        restoreAuth() {
            if (!process.client) return

            try {
                const userStr = localStorage.getItem('auth_user')
                const tokensStr = localStorage.getItem('auth_tokens')

                if (userStr && tokensStr) {
                    this.user = JSON.parse(userStr)
                    this.tokens = JSON.parse(tokensStr)
                    this.isAuthenticated = true

                    // Check if token is expired
                    if (this.isTokenExpired) {
                        this.clearAuth()
                    }
                }
            } catch (error) {
                console.error('Failed to restore auth:', error)
                this.clearAuth()
            }
        },

        /**
         * Update user data
         */
        updateUser(user: Partial<User>) {
            if (this.user) {
                this.user = { ...this.user, ...user }
                if (process.client) {
                    localStorage.setItem('auth_user', JSON.stringify(this.user))
                }
            }
        },

        /**
         * Update tokens
         */
        updateTokens(tokens: AuthTokens) {
            this.tokens = tokens
            if (process.client) {
                localStorage.setItem('auth_tokens', JSON.stringify(tokens))
            }
        },

        /**
         * Fetch session from legacy auth
         */
        async fetchSession() {
            try {
                const response: any = await $fetch('/api/auth/session')

                if (response.success && response.data?.user) {
                    const userData = response.data.user
                    this.user = {
                        id: userData.id,
                        email: userData.email,
                        name: userData.name,
                        employeeId: userData.employeeId,
                        role: (userData.role || userData.roleName || 'user').toLowerCase(),
                        roleId: userData.roleId || userData.role,
                        roleName: userData.roleName || userData.role,
                        // Extended fields
                        siteId: userData.siteId || null,
                        siteName: userData.siteName || null,
                        siteLogo: userData.siteLogo || null,
                        unitId: userData.unitId || null,
                        nik: userData.nik || null
                    }
                    this.isAuthenticated = true
                    return true
                }
            } catch (e) {
                console.error('Failed to fetch session:', e)
                this.clearAuth()
            }
            return false
        }
    },
})
