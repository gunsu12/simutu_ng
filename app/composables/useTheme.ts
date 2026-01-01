import { useLocalStorage } from '@vueuse/core'

export type Theme = 'light' | 'dark'

export const useTheme = () => {
  const theme = useLocalStorage<Theme>('theme', 'light')

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  const initTheme = () => {
    if (import.meta.client) {
      // Check system preference on first load
      if (!localStorage.getItem('theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        theme.value = prefersDark ? 'dark' : 'light'
      }
      document.documentElement.setAttribute('data-theme', theme.value)
    }
  }

  const isDark = computed(() => theme.value === 'dark')

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    initTheme
  }
}
