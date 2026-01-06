<script setup lang="ts">
import { RefreshCw, Save } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', (to, from) => {
    const { user } = useAuth()
    if (user.value?.role !== 'admin') {
      return navigateTo('/dashboard')
    }
  }]
})

const isLoading = ref(false)
const syncResult = ref<any>(null)
const error = ref<string | null>(null)

// Default values as per request, but editable
const formData = reactive({
  url: 'http://localhost/bros_hrs/public/api/sync/employees',
  apiKey: 'sk_NTI3OTU2ODY5NjU3YjZlMzQ5ZjEyNTA1ZjFlMDIwNGYwNjBkZDUzMzEyNTIxYzNmOWM3NTMxNGY3ZGQ5ZjYxNg=='
})

const handleSync = async () => {
  isLoading.value = true
  error.value = null
  syncResult.value = null

  try {
    const response = await $fetch('/api/sync/employees', {
      method: 'POST',
      body: {
        url: formData.url,
        apiKey: formData.apiKey
      }
    })
    syncResult.value = response
    useToast().add({
      title: 'Success',
      description: 'Data synchronization completed successfully.',
      color: 'green'
    })
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'An error occurred during synchronization.'
    useToast().add({
      title: 'Error',
      description: error.value,
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Employee Data Synchronization</h1>
        <p class="text-base-content/60">Sync Sites, Divisions, Units, and Employees from external HRS.</p>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl max-w-2xl">
      <div class="card-body">
        <form @submit.prevent="handleSync" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Sync Endpoint URL</span>
            </label>
            <input 
              v-model="formData.url" 
              type="url" 
              placeholder="https://api.example.com/sync" 
              class="input input-bordered w-full" 
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">API Key</span>
            </label>
            <input 
              v-model="formData.apiKey" 
              type="text" 
              placeholder="Your Secure API Key" 
              class="input input-bordered w-full font-mono" 
              required
            />
          </div>

          <div class="alert alert-warning shadow-sm">
            <RefreshCw class="w-4 h-4" />
            <span class="text-sm">This operation may take a while depending on the amount of data.</span>
          </div>

          <div v-if="error" class="alert alert-error shadow-sm">
            <span>{{ error }}</span>
          </div>

          <div v-if="syncResult" class="alert alert-success shadow-sm">
            <div>
              <h3 class="font-bold">Sync Completed!</h3>
              <div class="text-sm">
                <p>{{ syncResult.message }}</p>
                <ul class="list-disc list-inside mt-2">
                  <li>Processed: {{ syncResult.stats.processed }} records</li>
                  <li>Sites: {{ syncResult.stats.sites }}</li>
                  <li>Divisions: {{ syncResult.stats.divisions }}</li>
                  <li>Units: {{ syncResult.stats.units }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="card-actions justify-end mt-4">
            <button type="submit" class="btn btn-primary" :disabled="isLoading">
              <span v-if="isLoading" class="loading loading-spinner"></span>
              <RefreshCw v-else class="w-4 h-4 mr-2" />
              {{ isLoading ? 'Synchronizing...' : 'Start Sync' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
