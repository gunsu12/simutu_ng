import { useAuthStore } from '~/stores/auth'
import type { User, AuthTokens } from '~/types/auth'
import { generatePKCE, generateRandomString } from '~/utils/pkce'
import { buildAuthUrl, exchangeCodeForTokens, fetchUserInfo, refreshAccessToken, logSsoActivity } from '~/utils/auth'

export const useAuth = () => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  const router = useRouter()

  /**
   * Login - Redirect to SSO
   */
  const login = async (returnUrl?: string) => {
    if (!process.client) return

    await logSsoActivity('Starting login flow')

    // Clean up any stale data
    sessionStorage.clear()
    authStore.clearAuth()

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await generatePKCE()
    await logSsoActivity('PKCE Generated', { codeVerifier, codeChallenge })

    // Generate state and nonce
    const state = generateRandomString(32)
    const nonce = generateRandomString(32)
    await logSsoActivity('State and Nonce Generated', { state, nonce })

    // Store PKCE and state in sessionStorage
    sessionStorage.setItem('pkce_code_verifier', codeVerifier)
    sessionStorage.setItem('oauth_state', state)
    sessionStorage.setItem('oauth_nonce', nonce)
    if (returnUrl) {
      sessionStorage.setItem('return_url', returnUrl)
    }

    // Build authorization URL
    const authUrl = buildAuthUrl({
      baseUrl: config.public.sso.baseUrl,
      clientId: config.public.sso.clientId,
      redirectUri: config.public.sso.redirectUri,
      scopes: config.public.sso.scopes,
      state,
      nonce,
      codeChallenge,
    })
    await logSsoActivity('Auth URL built', { authUrl })

    // Redirect to SSO
    window.location.href = authUrl
  }

  /**
   * Handle OAuth callback
   */
  const handleCallback = async (code: string, state: string) => {
    if (!process.client) return

    await logSsoActivity('Handling callback', { code, state })

    // Verify state
    const savedState = sessionStorage.getItem('oauth_state')
    await logSsoActivity('Saved state', { savedState })

    if (state !== savedState) {
      await logSsoActivity('State mismatch', { received: state, expected: savedState })
      throw new Error('Invalid state parameter')
    }

    // Get PKCE verifier
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier')
    await logSsoActivity('PKCE Verifier retrieved', { codeVerifier })

    try {
      await logSsoActivity('Exchanging code for tokens...')
      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForTokens({
        baseUrl: config.public.sso.baseUrl,
        clientId: config.public.sso.clientId,
        redirectUri: config.public.sso.redirectUri,
        code,
        codeVerifier: codeVerifier || undefined,
      })
      await logSsoActivity('Token response received', tokenResponse)

      await logSsoActivity('Fetching user info...')
      // Fetch user info
      const userInfo = await fetchUserInfo(
        config.public.sso.baseUrl,
        tokenResponse.access_token
      )
      await logSsoActivity('User info received', userInfo)

      // Fetch local user data (sync with DB)
      await logSsoActivity('Syncing with local database...', { email: userInfo.email })

      let localUser: User | null = null

      try {
        const syncResponse = await $fetch<{ success: boolean, data: any }>('/api/auth/sync-sso', {
          method: 'POST',
          body: {
            email: userInfo.email,
            name: userInfo.name,
            role: (userInfo.role_name || userInfo.role || 'user'),
            siteId: userInfo.site_id || userInfo.siteId
          }
        })

        if (syncResponse.success && syncResponse.data) {
          localUser = syncResponse.data
          await logSsoActivity('Local user found', { role: localUser?.role })
        }
      } catch (err) {
        console.warn('Failed to sync with local DB, falling back to SSO data', err)
        await logSsoActivity('Local user lookup failed', { error: err })
      }

      // Prepare auth data (prioritize local DB, fallback to SSO)
      const user: User = localUser || {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        employeeId: userInfo.employee_id,
        department: userInfo.department,
        position: userInfo.position,
        avatarUrl: userInfo.avatar_url,
        role: (userInfo.role_name || userInfo.role || 'user').toLowerCase(),
        roleId: userInfo.role_id,
        roleName: userInfo.role_name,
        // Map extended fields (handle snake_case from OIDC)
        siteId: userInfo.site_id || userInfo.siteId || null,
        siteName: userInfo.site_name || userInfo.siteName || null,
        siteLogo: userInfo.site_logo || userInfo.siteLogo || null,
        unitId: userInfo.unit_id || userInfo.unitId || null,
        nik: userInfo.nik || null,
      }

      // Create server-side session (same as traditional login)
      await logSsoActivity('Creating server-side session...')
      try {
        await $fetch('/api/auth/sso-session', {
          method: 'POST',
          body: { email: user.email }
        })
        await logSsoActivity('Server-side session created')
      } catch (sessionErr) {
        await logSsoActivity('Failed to create server session', { error: sessionErr })
        throw new Error('Failed to create authentication session')
      }

      // Fetch the session to populate auth store (same as traditional login)
      await logSsoActivity('Fetching session data...')
      await authStore.fetchSession()

      // Clean up session storage
      sessionStorage.removeItem('pkce_code_verifier')
      sessionStorage.removeItem('oauth_state')
      sessionStorage.removeItem('oauth_nonce')

      // Redirect to return URL or dashboard (or password setup)
      let defaultReturn = '/dashboard'
      if (user.isNewUser) {
        defaultReturn = '/dashboard/settings/password'
        await logSsoActivity('New user detected, redirecting to password setup')
      }

      const returnUrl = sessionStorage.getItem('return_url') || defaultReturn
      sessionStorage.removeItem('return_url')

      await logSsoActivity('Redirecting to', { returnUrl })
      await router.push(returnUrl)
    } catch (error) {
      await logSsoActivity('OAuth callback error details', { error })
      throw error
    }
  }

  /**
   * Logout
   */
  const logout = async () => {
    const idToken = authStore.tokens?.idToken

    try {
      // Always try to invalidate server session (legacy/hybrid support)
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // Ignore error if already logged out or network error
      console.warn('Logout API call failed:', e)
    }

    // Clear local auth and storage
    authStore.clearAuth()
    if (process.client) {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_tokens')
      sessionStorage.clear()
    }

    // Redirect to SSO logout if we have id_token
    if (idToken && process.client) {
      const logoutUrl = new URL(`${config.public.sso.baseUrl}/api/oidc/logout`)
      logoutUrl.searchParams.set('id_token_hint', idToken)
      logoutUrl.searchParams.set('post_logout_redirect_uri', window.location.origin)

      window.location.href = logoutUrl.toString()
    } else {
      await router.push('/login')
    }
  }

  /**
   * Refresh token
   */
  const refresh = async () => {
    if (!authStore.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const tokenResponse = await refreshAccessToken({
        baseUrl: config.public.sso.baseUrl,
        clientId: config.public.sso.clientId,
        refreshToken: authStore.tokens.refreshToken,
      })

      const tokens: AuthTokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || authStore.tokens.refreshToken,
        idToken: tokenResponse.id_token || authStore.tokens.idToken,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      }

      authStore.updateTokens(tokens)
    } catch (error) {
      console.error('Token refresh failed:', error)
      // If refresh fails, logout
      await logout()
      throw error
    }
  }

  /**
   * Auto-refresh token if needed
   */
  const ensureValidToken = async () => {
    if (authStore.shouldRefreshToken) {
      await refresh()
    }
  }

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isLoading: computed(() => authStore.isLoading),
    login,
    logout,
    handleCallback,
    refresh,
    ensureValidToken,
  }
}
