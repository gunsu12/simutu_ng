<script setup lang="ts">
import { Save, User, Bell, Shield, Palette } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const { user } = useAuth()
const { theme, setTheme, isDark } = useTheme()

const activeTab = ref('profile')

const tabs = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'appearance', name: 'Appearance', icon: Palette }
]

const profileForm = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
  phone: '',
  company: '',
  bio: ''
})

const notificationSettings = reactive({
  emailNotifications: true,
  pushNotifications: true,
  weeklyReport: false,
  securityAlerts: true
})

const handleSave = () => {
  // Implement save logic
  console.log('Saving settings...')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-base-content">Settings</h1>
      <p class="text-base-content/60 mt-1">Manage your account settings and preferences.</p>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Sidebar Tabs -->
      <div class="lg:w-64 shrink-0">
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
      <div class="flex-1">
        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-6">Profile Information</h2>
            
            <form @submit.prevent="handleSave" class="space-y-6">
              <div class="flex items-center gap-6">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-20">
                    <span class="text-2xl">{{ user?.name?.charAt(0) || 'U' }}</span>
                  </div>
                </div>
                <div>
                  <button type="button" class="btn btn-sm btn-outline">Change Avatar</button>
                  <p class="text-xs text-base-content/60 mt-2">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Full Name</span>
                  </label>
                  <input 
                    v-model="profileForm.name"
                    type="text" 
                    class="input input-bordered" 
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Email</span>
                  </label>
                  <input 
                    v-model="profileForm.email"
                    type="email" 
                    class="input input-bordered" 
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Phone</span>
                  </label>
                  <input 
                    v-model="profileForm.phone"
                    type="tel" 
                    placeholder="+1 (555) 000-0000"
                    class="input input-bordered" 
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Company</span>
                  </label>
                  <input 
                    v-model="profileForm.company"
                    type="text" 
                    placeholder="Your company name"
                    class="input input-bordered" 
                  />
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Bio</span>
                </label>
                <textarea 
                  v-model="profileForm.bio"
                  class="textarea textarea-bordered h-24" 
                  placeholder="Tell us about yourself..."
                ></textarea>
              </div>

              <div class="flex justify-end">
                <button type="submit" class="btn btn-primary gap-2">
                  <Save class="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Notifications Tab -->
        <div v-if="activeTab === 'notifications'" class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-6">Notification Preferences</h2>
            
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Email Notifications</p>
                  <p class="text-sm text-base-content/60">Receive email about your account activity</p>
                </div>
                <input 
                  v-model="notificationSettings.emailNotifications"
                  type="checkbox" 
                  class="toggle toggle-primary" 
                />
              </div>
              
              <div class="divider my-0"></div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Push Notifications</p>
                  <p class="text-sm text-base-content/60">Receive push notifications on your devices</p>
                </div>
                <input 
                  v-model="notificationSettings.pushNotifications"
                  type="checkbox" 
                  class="toggle toggle-primary" 
                />
              </div>
              
              <div class="divider my-0"></div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Weekly Report</p>
                  <p class="text-sm text-base-content/60">Get a weekly summary of your dashboard activity</p>
                </div>
                <input 
                  v-model="notificationSettings.weeklyReport"
                  type="checkbox" 
                  class="toggle toggle-primary" 
                />
              </div>
              
              <div class="divider my-0"></div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Security Alerts</p>
                  <p class="text-sm text-base-content/60">Get notified about security events</p>
                </div>
                <input 
                  v-model="notificationSettings.securityAlerts"
                  type="checkbox" 
                  class="toggle toggle-primary" 
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-6">Security Settings</h2>
            
            <div class="space-y-6">
              <div class="p-4 bg-base-200/50 rounded-lg">
                <h3 class="font-medium mb-4">Change Password</h3>
                <div class="space-y-4 max-w-md">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Current Password</span>
                    </label>
                    <input type="password" class="input input-bordered" />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">New Password</span>
                    </label>
                    <input type="password" class="input input-bordered" />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Confirm New Password</span>
                    </label>
                    <input type="password" class="input input-bordered" />
                  </div>
                  <button class="btn btn-primary btn-sm">Update Password</button>
                </div>
              </div>

              <div class="p-4 bg-base-200/50 rounded-lg">
                <h3 class="font-medium mb-2">Two-Factor Authentication</h3>
                <p class="text-sm text-base-content/60 mb-4">Add an extra layer of security to your account</p>
                <button class="btn btn-outline btn-sm">Enable 2FA</button>
              </div>

              <div class="p-4 bg-error/10 border border-error/20 rounded-lg">
                <h3 class="font-medium text-error mb-2">Danger Zone</h3>
                <p class="text-sm text-base-content/60 mb-4">Permanently delete your account and all data</p>
                <button class="btn btn-error btn-sm btn-outline">Delete Account</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Appearance Tab -->
        <div v-if="activeTab === 'appearance'" class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-6">Appearance</h2>
            
            <div class="space-y-6">
              <div>
                <h3 class="font-medium mb-4">Theme</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label 
                    class="cursor-pointer p-4 rounded-lg border-2 transition-all"
                    :class="!isDark ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-content/30'"
                    @click="setTheme('light')"
                  >
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                        <div class="w-6 h-6 bg-blue-500 rounded"></div>
                      </div>
                      <div>
                        <p class="font-medium">Light</p>
                        <p class="text-sm text-base-content/60">Clean and bright</p>
                      </div>
                    </div>
                  </label>
                  
                  <label 
                    class="cursor-pointer p-4 rounded-lg border-2 transition-all"
                    :class="isDark ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-content/30'"
                    @click="setTheme('dark')"
                  >
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
                        <div class="w-6 h-6 bg-blue-500 rounded"></div>
                      </div>
                      <div>
                        <p class="font-medium">Dark</p>
                        <p class="text-sm text-base-content/60">Easy on the eyes</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
