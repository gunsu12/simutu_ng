<script setup lang="ts">
import { KeyRound, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordStrength = computed(() => {
  const password = passwordForm.newPassword
  if (!password) return { score: 0, label: '', color: '' }
  
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  if (score <= 2) return { score, label: 'Lemah', color: 'bg-error' }
  if (score <= 3) return { score, label: 'Sedang', color: 'bg-warning' }
  if (score <= 4) return { score, label: 'Kuat', color: 'bg-info' }
  return { score, label: 'Sangat Kuat', color: 'bg-success' }
})

const validateForm = () => {
  let isValid = true
  errors.currentPassword = ''
  errors.newPassword = ''
  errors.confirmPassword = ''
  
  if (!passwordForm.currentPassword) {
    errors.currentPassword = 'Password saat ini harus diisi'
    isValid = false
  }
  
  if (!passwordForm.newPassword) {
    errors.newPassword = 'Password baru harus diisi'
    isValid = false
  } else if (passwordForm.newPassword.length < 8) {
    errors.newPassword = 'Password minimal 8 karakter'
    isValid = false
  }
  
  if (!passwordForm.confirmPassword) {
    errors.confirmPassword = 'Konfirmasi password harus diisi'
    isValid = false
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    errors.confirmPassword = 'Password tidak cocok'
    isValid = false
  }
  
  return isValid
}

const handleSubmit = () => {
  if (validateForm()) {
    // Implement password update logic
    console.log('Updating password...')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-base-content">Update Password</h1>
      <p class="text-base-content/60 mt-1">Ubah password akun Anda.</p>
    </div>

    <!-- Password Card -->
    <div class="card bg-base-100 border border-base-300 shadow-sm max-w-xl">
      <div class="card-body">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Current Password -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Password Saat Ini</span>
            </label>
            <div class="relative">
              <input 
                v-model="passwordForm.currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                placeholder="Masukkan password saat ini"
                class="input input-bordered w-full pr-10"
                :class="{ 'input-error': errors.currentPassword }"
              />
              <button 
                type="button"
                class="absolute right-3 top-1/2 transform -translate-y-1/2"
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <Eye v-if="!showCurrentPassword" class="w-4 h-4 text-base-content/50" />
                <EyeOff v-else class="w-4 h-4 text-base-content/50" />
              </button>
            </div>
            <label v-if="errors.currentPassword" class="label">
              <span class="label-text-alt text-error">{{ errors.currentPassword }}</span>
            </label>
          </div>

          <!-- New Password -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Password Baru</span>
            </label>
            <div class="relative">
              <input 
                v-model="passwordForm.newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Masukkan password baru"
                class="input input-bordered w-full pr-10"
                :class="{ 'input-error': errors.newPassword }"
              />
              <button 
                type="button"
                class="absolute right-3 top-1/2 transform -translate-y-1/2"
                @click="showNewPassword = !showNewPassword"
              >
                <Eye v-if="!showNewPassword" class="w-4 h-4 text-base-content/50" />
                <EyeOff v-else class="w-4 h-4 text-base-content/50" />
              </button>
            </div>
            <!-- Password Strength -->
            <div v-if="passwordForm.newPassword" class="mt-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1 bg-base-200 rounded-full overflow-hidden">
                  <div 
                    class="h-full transition-all"
                    :class="passwordStrength.color"
                    :style="{ width: `${(passwordStrength.score / 5) * 100}%` }"
                  ></div>
                </div>
                <span class="text-xs" :class="passwordStrength.color.replace('bg-', 'text-')">
                  {{ passwordStrength.label }}
                </span>
              </div>
            </div>
            <label v-if="errors.newPassword" class="label">
              <span class="label-text-alt text-error">{{ errors.newPassword }}</span>
            </label>
          </div>

          <!-- Confirm Password -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Konfirmasi Password Baru</span>
            </label>
            <div class="relative">
              <input 
                v-model="passwordForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Ulangi password baru"
                class="input input-bordered w-full pr-10"
                :class="{ 'input-error': errors.confirmPassword }"
              />
              <button 
                type="button"
                class="absolute right-3 top-1/2 transform -translate-y-1/2"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <Eye v-if="!showConfirmPassword" class="w-4 h-4 text-base-content/50" />
                <EyeOff v-else class="w-4 h-4 text-base-content/50" />
              </button>
            </div>
            <label v-if="errors.confirmPassword" class="label">
              <span class="label-text-alt text-error">{{ errors.confirmPassword }}</span>
            </label>
          </div>

          <!-- Password Requirements -->
          <div class="bg-base-200/50 rounded-lg p-4">
            <p class="text-sm font-medium mb-2">Persyaratan Password:</p>
            <ul class="text-sm text-base-content/70 space-y-1">
              <li class="flex items-center gap-2">
                <CheckCircle v-if="passwordForm.newPassword.length >= 8" class="w-4 h-4 text-success" />
                <AlertCircle v-else class="w-4 h-4 text-base-content/30" />
                Minimal 8 karakter
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle v-if="/[A-Z]/.test(passwordForm.newPassword)" class="w-4 h-4 text-success" />
                <AlertCircle v-else class="w-4 h-4 text-base-content/30" />
                Mengandung huruf besar
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle v-if="/[0-9]/.test(passwordForm.newPassword)" class="w-4 h-4 text-success" />
                <AlertCircle v-else class="w-4 h-4 text-base-content/30" />
                Mengandung angka
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle v-if="/[^a-zA-Z0-9]/.test(passwordForm.newPassword)" class="w-4 h-4 text-success" />
                <AlertCircle v-else class="w-4 h-4 text-base-content/30" />
                Mengandung karakter khusus
              </li>
            </ul>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary gap-2">
              <Save class="w-4 h-4" />
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
