<script setup lang="ts">
import { Sun, Moon, Building2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'auth'
})

const { login, loading } = useAuth()
const { toggleTheme, isDark, initTheme } = useTheme()

const isLoading = ref(false)

const handleCompanySSO = async () => {
  isLoading.value = true
  try {
    await login('company')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left Panel - Branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary p-12 flex-col justify-between">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-xl">S</span>
          </div>
          <span class="text-2xl font-bold text-white">Simutu NG</span>
        </div>
      </div>
      
      <div class="space-y-6">
        <h1 class="text-4xl font-bold text-white leading-tight">
          Welcome to your<br />Modern Dashboard
        </h1>
        <p class="text-white/80 text-lg max-w-md">
          Manage your business with a clean, intuitive, and powerful dashboard experience.
        </p>
      </div>

      <div class="flex items-center gap-4 text-white/60 text-sm">
        <span>© 2026 Simutu NG</span>
        <span>•</span>
        <a href="#" class="hover:text-white transition-colors">Privacy</a>
        <span>•</span>
        <a href="#" class="hover:text-white transition-colors">Terms</a>
      </div>
    </div>

    <!-- Right Panel - Login Form -->
    <div class="flex-1 flex flex-col">
      <!-- Theme Toggle -->
      <div class="flex justify-end p-6">
        <button 
          class="btn btn-ghost btn-sm btn-square"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>
      </div>

      <!-- Login Form -->
      <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div class="w-full max-w-md space-y-8">
          <!-- Mobile Logo -->
          <div class="lg:hidden text-center">
            <div class="flex items-center justify-center gap-3 mb-4">
              <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <span class="text-primary-content font-bold text-xl">S</span>
              </div>
              <span class="text-2xl font-bold text-base-content">Simutu NG</span>
            </div>
          </div>

          <div class="text-center lg:text-left">
            <h2 class="text-3xl font-bold text-base-content">Sign in</h2>
            <p class="mt-2 text-base-content/60">
              Use your company account to sign in
            </p>
          </div>

          <!-- Company SSO Button -->
          <div>
            <button
              @click="handleCompanySSO"
              :disabled="isLoading"
              class="btn btn-primary w-full h-14 gap-3 font-medium text-base"
            >
              <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
              <Building2 v-else class="w-5 h-5" />
              Sign in with Company SSO
            </button>
          </div>

          <div class="divider text-base-content/40">or</div>

          <!-- Email Login (Optional - for future implementation) -->
          <form class="space-y-4" @submit.prevent>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Email</span>
              </label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                class="input input-bordered w-full focus:input-primary"
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Password</span>
              </label>
              <input 
                type="password" 
                placeholder="••••••••" 
                class="input input-bordered w-full focus:input-primary"
              />
              <label class="label">
                <a href="#" class="label-text-alt link link-hover text-primary">Forgot password?</a>
              </label>
            </div>

            <button type="submit" class="btn btn-primary w-full h-12">
              Sign in with Email
            </button>
          </form>

          <p class="text-center text-sm text-base-content/60">
            Don't have an account? 
            <a href="#" class="link link-primary font-medium">Contact administrator</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
