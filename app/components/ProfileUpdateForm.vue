<script setup lang="ts">
import { AlertCircle, CheckCircle, Loader } from 'lucide-vue-next'
import { ref, reactive } from 'vue'

const { user } = useAuth()

const loading = ref(false)
const showMessage = ref(false)
const messageType = ref<'success' | 'error'>('success')
const message = ref('')

const form = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
})

const formError = reactive({
  name: '',
  email: '',
})

const validateForm = () => {
  formError.name = ''
  formError.email = ''

  if (!form.name.trim()) {
    formError.name = 'Name is required'
  }

  if (!form.email.trim()) {
    formError.email = 'Email is required'
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      formError.email = 'Invalid email format'
    }
  }

  return !formError.name && !formError.email
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  try {
    const response = await $fetch('/api/users/update-profile', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
      },
    })

    if (response.success) {
      messageType.value = 'success'
      message.value = 'Profile updated successfully!'
      showMessage.value = true

      // Update user in composable
      if (user.value) {
        user.value.name = response.data.name
        user.value.email = response.data.email
      }

      setTimeout(() => {
        showMessage.value = false
      }, 5000)
    }
  } catch (error: any) {
    messageType.value = 'error'
    message.value = error.data?.message || 'Failed to update profile'
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
      <!-- Name Field -->
      <div>
        <label for="name" class="block text-sm font-medium text-base-content mb-2">Full Name</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          placeholder="Enter your full name"
          class="w-full px-4 py-2 rounded-lg border border-base-300 bg-base-100 text-base-content placeholder-base-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          :class="{ 'border-error focus:border-error focus:ring-error/20': formError.name }"
        />
        <p v-if="formError.name" class="text-error text-sm mt-1">{{ formError.name }}</p>
      </div>

      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium text-base-content mb-2">Email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="Enter your email"
          class="w-full px-4 py-2 rounded-lg border border-base-300 bg-base-100 text-base-content placeholder-base-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          :class="{ 'border-error focus:border-error focus:ring-error/20': formError.email }"
        />
        <p v-if="formError.email" class="text-error text-sm mt-1">{{ formError.email }}</p>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Loader v-if="loading" class="w-4 h-4 animate-spin" />
        <span>{{ loading ? 'Saving...' : 'Save Changes' }}</span>
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
