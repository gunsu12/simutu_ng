export interface User {
  id: string
  name: string
  email: string
  username: string
  role: 'admin' | 'user' | 'manager' | 'auditor'
  employeeId?: string | null
  siteId?: string | null
  siteLogo?: string | null
  siteName?: string | null
  unitId?: string | null
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}

export const useAuth = () => {
  const user = useState<User | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)
  const loading = useState('auth-loading', () => false)

  const fetchSession = async () => {
    try {
      const response = await $fetch<{ success: boolean; data: { user: User } }>('/api/auth/session')
      if (response.success && response.data?.user) {
        user.value = response.data.user
        return true
      } else {
        user.value = null
        return false
      }
    } catch (error) {
      user.value = null
      return false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      await navigateTo('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    fetchSession,
    logout
  }
}
