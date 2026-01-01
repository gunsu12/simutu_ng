<script setup lang="ts">
import { LogIn } from 'lucide-vue-next'

definePageMeta({
  layout: false,
})

const { fetchSession } = useAuth()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    })

    if (response.success) {
      // Fetch session to populate user state
      await fetchSession()
      // Force redirect to dashboard
      window.location.href = '/dashboard'
    } else {
      error.value = response.message || 'Login failed'
    }
  } catch (err: any) {
    error.value = err?.data?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Logo/Title -->
        <div class="text-center mb-6">
          <div class="flex items-center justify-center gap-3 mb-4">
            <div class="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span class="text-primary-content font-bold text-2xl">S</span>
            </div>
            <span class="text-3xl font-bold text-base-content">Simutu NG</span>
          </div>
          <h2 class="text-2xl font-bold text-base-content">Sign In</h2>
          <p class="text-base-content/60 mt-2">Enter your credentials to access the dashboard</p>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Email</span>
            </label>
            <input 
              v-model="email"
              type="email" 
              placeholder="admin@example.com" 
              class="input input-bordered w-full"
              required
              :disabled="loading"
            />
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Password</span>
            </label>
            <input 
              v-model="password"
              type="password" 
              placeholder="••••••••" 
              class="input input-bordered w-full"
              required
              :disabled="loading"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-full"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Demo Credentials -->
        <div class="divider text-xs">Demo Credentials</div>
        <div class="bg-base-200 p-4 rounded-lg text-sm space-y-1">
          <p class="font-medium text-base-content/80">Admin Account:</p>
          <p class="text-base-content/60">Email: <span class="font-mono">admin@example.com</span></p>
          <p class="text-base-content/60">Password: <span class="font-mono">password</span></p>
        </div>
      </div>
    </div>
  </div>
</template>
