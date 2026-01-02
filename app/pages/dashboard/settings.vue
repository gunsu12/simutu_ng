<script setup lang="ts">
import { User, Shield } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const { user } = useAuth()

const activeTab = ref('profile')

const tabs = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'security', name: 'Security', icon: Shield },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-base-content">Settings</h1>
      <p class="text-base-content/60 mt-1">Manage your account settings and preferences.</p>
    </div>

    <div class="flex gap-6" style="display: flex; flex-direction: row;">
      <!-- Sidebar Tabs -->
      <div style="width: 250px; flex-shrink: 0;">
        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body p-2">
            <ul class="menu">
              <li v-for="tab in tabs" :key="tab.id">
                <a 
                  :class="{ 'active': activeTab === tab.id }"
                  @click="activeTab = tab.id"
                >
                  <component :is="tab.icon" class="w-4 h-4" />
                  {{ tab.name }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div style="flex: 1; min-width: 0;">
        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-6">Profile Information</h2>
            
            <div class="max-w-2xl">
              <ProfileUpdateForm />
            </div>
          </div>
        </div>

        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-6">Security Settings</h2>
            
            <div class="max-w-2xl">
              <h3 class="font-medium mb-4">Change Password</h3>
              <PasswordUpdateForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
