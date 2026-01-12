/**
 * Build authorization URL for OIDC flow
 */
export function buildAuthUrl(config: {
    baseUrl: string
    clientId: string
    redirectUri: string
    scopes: string[]
    state: string
    nonce: string
    codeChallenge?: string
}): string {
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: config.state,
        nonce: config.nonce,
    })

    // Add PKCE challenge if provided
    if (config.codeChallenge) {
        params.append('code_challenge', config.codeChallenge)
        params.append('code_challenge_method', 'S256')
    }

    return `${config.baseUrl}/api/oidc/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
/**
 * Log SSO activity to backend
 */
export async function logSsoActivity(description: string, details?: any) {
    try {
        await $fetch('/api/activity-logs/create', {
            method: 'POST',
            body: {
                action: 'LOGIN',
                module: 'auth',
                description: `[SSO] ${description}`,
                details,
                userName: 'SSO Client',
                userEmail: 'system@sso'
            }
        })
    } catch (e) {
        console.error('Failed to send SSO log:', e)
    }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(config: {
    baseUrl: string
    clientId: string
    clientSecret?: string
    redirectUri: string
    code: string
    codeVerifier?: string
}): Promise<any> {
    const body: Record<string, string> = {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        code: config.code,
    }

    // Add client secret if not using PKCE
    if (config.clientSecret) {
        body.client_secret = config.clientSecret
    }

    // Add PKCE verifier
    if (config.codeVerifier) {
        body.code_verifier = config.codeVerifier
    }

    await logSsoActivity('Exchanging code for tokens', { ...body, client_secret: '***' })

    const response = await $fetch(`${config.baseUrl}/api/oidc/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body),
    }).catch(async err => {
        await logSsoActivity('Token exchange failed', { error: err })
        throw err
    })

    return response
}

/**
 * Fetch user info from SSO
 */
export async function fetchUserInfo(baseUrl: string, accessToken: string): Promise<any> {
    await logSsoActivity('Fetching user info', { tokenPrefix: accessToken.substring(0, 10) + '...' })

    return await $fetch(`${baseUrl}/api/oidc/userinfo`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }).catch(async err => {
        await logSsoActivity('User info fetch failed', { error: err })
        throw err
    })
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(config: {
    baseUrl: string
    clientId: string
    clientSecret?: string
    refreshToken: string
}): Promise<any> {
    const body: Record<string, string> = {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: config.refreshToken,
    }

    if (config.clientSecret) {
        body.client_secret = config.clientSecret
    }

    await logSsoActivity('Refreshing token')

    const response = await $fetch(`${config.baseUrl}/api/oidc/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body),
    }).catch(async err => {
        await logSsoActivity('Token refresh failed', { error: err })
        throw err
    })

    return response
}
