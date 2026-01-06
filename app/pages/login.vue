<script setup lang="ts">
import { LogIn, ShieldCheck } from 'lucide-vue-next'

definePageMeta({
  layout: false,
  middleware: ['guest']
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

    if ((response as any).success) {
      // Fetch session to populate user state
      await fetchSession()
      // Force redirect to dashboard
      window.location.href = '/dashboard'
    } else {
      error.value = (response as any).message || 'Login failed'
    }
  } catch (err: any) {
    error.value = err?.data?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-base-100">
    <!-- Left Side: Branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
      <!-- Background Decorative Elements -->
      <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary via-primary/90 to-blue-600"></div>
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      
      <div class="relative z-10 text-center text-primary-content max-w-lg">
        <div class="flex items-center justify-center gap-6 mb-8">
          <div class="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-2xl">
            <img src="/images/logo.webp" alt="Logo" class="h-20 w-auto object-contain brightness-0 invert" />
          </div>
          <div class="h-16 w-px bg-white/30"></div>
          <div class="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-2xl">
            <img src="/images/logo-rsia.webp" alt="Logo RSIA" class="h-20 w-auto object-contain brightness-0 invert" />
          </div>
        </div>
        
        <h1 class="text-4xl font-extrabold tracking-tight mb-4">
          SIMUTU NG
        </h1>
        <p class="text-xl text-white/80 font-medium leading-relaxed">
          Sistem Informasi Manajemen Mutu Rumah Sakit
        </p>
        
        <div class="mt-12 space-y-4">
          <div class="flex items-center gap-3 text-white/70">
            <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span>Input Indikator Mutu Bulanan dan Harian</span>
          </div>
          <div class="flex items-center gap-3 text-white/70">
            <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span>Monitoring Indikator Mutu Real-time</span>
          </div>
          <div class="flex items-center gap-3 text-white/70">
            <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span>Pelaporan Kegiatan PDCA Terintegrasi</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Side: Login Form -->
    <div class="flex-1 flex items-center justify-center p-6 sm:p-12 lg:w-1/2 bg-base-200 lg:bg-base-100">
      <div class="w-full max-w-md">
        <!-- Mobile Branding -->
        <div class="lg:hidden text-center mb-8">
          <div class="flex items-center justify-center gap-4 mb-4">
            <img src="/images/logo.webp" alt="Logo" class="h-12 w-auto object-contain" />
            <div class="divider divider-horizontal mx-0"></div>
            <img src="/images/logo-rsia.webp" alt="Logo RSIA" class="h-12 w-auto object-contain" />
          </div>
          <h2 class="text-2xl font-bold text-base-content">SIMUTU NG</h2>
        </div>

        <div class="card bg-base-100 lg:border-none lg:shadow-none shadow-xl overflow-hidden">
          <div class="card-body p-0 sm:p-8">
            <div class="mb-8">
              <h2 class="text-3xl font-bold text-base-content mb-2">Selamat Datang</h2>
              <p class="text-base-content/60">Silakan masukkan detail akun Anda untuk masuk ke dashboard.</p>
            </div>

            <!-- Error Alert -->
            <transition name="fade">
              <div v-if="error" class="alert alert-error mb-6 shadow-sm border-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-medium">{{ error }}</span>
              </div>
            </transition>

            <!-- Login Form -->
            <form @submit.prevent="handleLogin" class="space-y-5">
              <div class="form-control">
                <label class="label pb-1">
                  <span class="label-text font-semibold uppercase text-xs tracking-wider text-base-content/60">Alamat Email</span>
                </label>
                <input 
                  v-model="email"
                  type="email" 
                  placeholder="admin@example.com" 
                  class="input input-bordered focus:input-primary bg-base-200/50 border-base-300 w-full transition-all duration-200"
                  required
                  :disabled="loading"
                />
              </div>
              
              <div class="form-control">
                <div class="flex justify-between items-end mb-1">
                  <label class="label p-0">
                    <span class="label-text font-semibold uppercase text-xs tracking-wider text-base-content/60">Password</span>
                  </label>
                  <a href="#" class="text-xs font-semibold text-primary hover:underline transition-all">Lupa Password?</a>
                </div>
                <input 
                  v-model="password"
                  type="password" 
                  placeholder="••••••••" 
                  class="input input-bordered focus:input-primary bg-base-200/50 border-base-300 w-full transition-all duration-200"
                  required
                  :disabled="loading"
                />
              </div>

              <div class="form-control mt-4">
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="checkbox checkbox-primary checkbox-sm border-base-300" />
                  <span class="label-text text-sm font-medium">Ingat saya selama 30 hari</span>
                </label>
              </div>

              <button 
                type="submit" 
                class="btn btn-primary w-full h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 group"
                :disabled="loading"
              >
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                <div v-else class="flex items-center justify-center gap-2">
                  <span class="font-bold">Masuk Sekarang</span>
                  <LogIn class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <div class="relative py-2">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-base-300"></div>
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-base-100 px-2 text-base-content/40 font-bold">Atau</span>
                </div>
              </div>

              <button 
                type="button"
                @click="navigateTo('/api/auth/login/sso', { external: true })"
                class="btn btn-outline btn-secondary w-full h-12 border-2 hover:bg-secondary/10 hover:text-secondary transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ShieldCheck class="w-5 h-5" />
                <span class="font-bold">Masuk dengan SSO</span>
              </button>
            </form>

            <!-- Demo Credentials -->
            <!-- <div class="mt-10">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-base-300"></div>
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-base-100 px-2 text-base-content/40 font-bold">Akses Demo</span>
                </div>
              </div>
              
              <div class="mt-6 p-4 rounded-xl bg-base-200/80 border border-base-300/50 text-sm">
                <div class="flex flex-col gap-2">
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Email:</span>
                    <span class="font-mono font-bold text-primary">admin@example.com</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Password:</span>
                    <span class="font-mono font-bold text-primary">password</span>
                  </div>
                </div>
              </div>
            </div> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
