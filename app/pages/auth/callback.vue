<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-lg text-center">
      <h2 class="text-2xl font-bold mb-4">Authenticating...</h2>
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p class="mt-4 text-gray-600">Please wait while we log you in.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logSsoActivity } from '~/utils/auth'

definePageMeta({
  layout: false
})

const route = useRoute()
const { handleCallback } = useAuth()

onMounted(async () => {
  await logSsoActivity('Callback page mounted', { query: route.query })
  
  const code = route.query.code as string
  const state = route.query.state as string

  if (code && state) {
    try {
      await logSsoActivity('Calling handleCallback...')
      await handleCallback(code, state)
    } catch (error) {
      await logSsoActivity('Auth callback error caught in page', { error })
      // Handle error (e.g. redirect to login with error)
      navigateTo('/login?error=auth_failed')
    }
  } else {
    await logSsoActivity('Missing code or state in query parameters')
    navigateTo('/login')
  }
})
</script>
