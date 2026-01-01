export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'manager'
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

  const login = async (provider: 'company') => {
    loading.value = true
    
    try {
      // Simulate SSO login - replace with actual SSO implementation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock user data - replace with actual auth response
      user.value = {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@company.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=company',
        role: 'admin'
      }
      
      navigateTo('/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      user.value = null
      navigateTo('/login')
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout
  }
}
