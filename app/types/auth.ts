export interface User {
    id: string
    email: string
    name: string
    employeeId?: string
    department?: string
    position?: string
    avatarUrl?: string
    roleId?: string
    roleName?: string
    role: string
    // Extended fields for dashboard
    siteId?: string | null
    siteName?: string | null
    siteLogo?: string | null
    unitId?: string | null
    nik?: string | null
    isNewUser?: boolean
}

export interface AuthTokens {
    accessToken: string
    refreshToken: string
    idToken: string
    expiresAt: number
}

export interface AuthState {
    user: User | null
    tokens: AuthTokens | null
    isAuthenticated: boolean
    isLoading: boolean
}
