<script setup lang="ts">
import { AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-vue-next'
import { ref, reactive } from 'vue'

const loading = ref(false)
const showMessage = ref(false)
const messageType = ref<'success' | 'error'>('success')
const message = ref('')

const showPassword = reactive({
  current: false,
  new: false,
  confirm: false,
})

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const formError = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateForm = () => {
  formError.currentPassword = ''
  formError.newPassword = ''
  formError.confirmPassword = ''

  if (!form.currentPassword) {
    formError.currentPassword = 'Current password is required'
  }

  if (!form.newPassword) {
    formError.newPassword = 'New password is required'
  } else if (form.newPassword.length < 6) {
    formError.newPassword = 'Password must be at least 6 characters'
  }

  if (!form.confirmPassword) {
    formError.confirmPassword = 'Please confirm your password'
  } else if (form.newPassword !== form.confirmPassword) {
    formError.confirmPassword = 'Passwords do not match'
  }

  return !formError.currentPassword && !formError.newPassword && !formError.confirmPassword
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  try {
    const response = await $fetch('/api/users/update-password', {
      method: 'POST',
      body: {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      },
    })

    if (response.success) {
      messageType.value = 'success'
      message.value = 'Password updated successfully!'
      showMessage.value = true

      // Reset form
      form.currentPassword = ''
      form.newPassword = ''
      form.confirmPassword = ''
      showPassword.current = false
      showPassword.new = false
      showPassword.confirm = false

      setTimeout(() => {
        showMessage.value = false
      }, 5000)
    }
  } catch (error: any) {
    messageType.value = 'error'
    message.value = error.data?.message || 'Failed to update password'
    showMessage.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Alert Messages -->
    <Transition name="fade">
      <div v-if="showMessage" class="flex items-center gap-3 p-4 rounded-lg" :class="messageType === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'">
        <CheckCircle v-if="messageType === 'success'" class="w-5 h-5" />
        <AlertCircle v-else class="w-5 h-5" />
        <p>{{ message }}</p>
      </div>
    </Transition>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Current Password Field -->
      <div>
        <label for="currentPassword" class="block text-sm font-medium text-base-content mb-2">Current Password</label>
        <div class="relative">
          <input
            id="currentPassword"
            v-model="form.currentPassword"
            :type="showPassword.current ? 'text' : 'password'"
            placeholder="Enter your current password"
            class="w-full px-4 py-2 pr-10 rounded-lg border border-base-300 bg-base-100 text-base-content placeholder-base-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            :class="{ 'border-error focus:border-error focus:ring-error/20': formError.currentPassword }"
          />
          <button
            type="button"
            @click="showPassword.current = !showPassword.current"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition"
          >
            <Eye v-if="!showPassword.current" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <p v-if="formError.currentPassword" class="text-error text-sm mt-1">{{ formError.currentPassword }}</p>
      </div>

      <!-- New Password Field -->
      <div>
        <label for="newPassword" class="block text-sm font-medium text-base-content mb-2">New Password</label>
        <div class="relative">
          <input
            id="newPassword"
            v-model="form.newPassword"
            :type="showPassword.new ? 'text' : 'password'"
            placeholder="Enter your new password"
            class="w-full px-4 py-2 pr-10 rounded-lg border border-base-300 bg-base-100 text-base-content placeholder-base-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            :class="{ 'border-error focus:border-error focus:ring-error/20': formError.newPassword }"
          />
          <button
            type="button"
            @click="showPassword.new = !showPassword.new"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition"
          >
            <Eye v-if="!showPassword.new" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <p v-if="formError.newPassword" class="text-error text-sm mt-1">{{ formError.newPassword }}</p>
      </div>

      <!-- Confirm Password Field -->
      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-base-content mb-2">Confirm New Password</label>
        <div class="relative">
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            :type="showPassword.confirm ? 'text' : 'password'"
            placeholder="Confirm your new password"
            class="w-full px-4 py-2 pr-10 rounded-lg border border-base-300 bg-base-100 text-base-content placeholder-base-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            :class="{ 'border-error focus:border-error focus:ring-error/20': formError.confirmPassword }"
          />
          <button
            type="button"
            @click="showPassword.confirm = !showPassword.confirm"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition"
          >
            <Eye v-if="!showPassword.confirm" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <p v-if="formError.confirmPassword" class="text-error text-sm mt-1">{{ formError.confirmPassword }}</p>
      </div>

      <!-- Password Requirements -->
      <div class="bg-info/10 text-info text-sm p-3 rounded-lg">
        <p class="font-medium mb-1">Password Requirements:</p>
        <ul class="list-disc list-inside space-y-1">
          <li>At least 6 characters long</li>
          <li>Different from your current password</li>
        </ul>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Loader v-if="loading" class="w-4 h-4 animate-spin" />
        <span>{{ loading ? 'Updating...' : 'Update Password' }}</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
