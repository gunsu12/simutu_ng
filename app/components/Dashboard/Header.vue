<script setup lang="ts">
import { Menu, Sun, Moon, Bell, Search, LogOut, ChevronDown } from 'lucide-vue-next'

const emit = defineEmits<{
  toggleSidebar: []
}>()

const { theme, toggleTheme, isDark } = useTheme()
const { user, logout, loading } = useAuth()

const showUserMenu = ref(false)

const handleLogout = async () => {
  showUserMenu.value = false
  await logout()
}
</script>

<template>
  <header class="sticky top-0 z-40 h-16 bg-base-100 border-b border-base-300">
    <div class="flex items-center justify-between h-full px-4 lg:px-6">
      <!-- Left Section -->
      <div class="flex items-center gap-4">
        <button 
          class="btn btn-ghost btn-sm btn-square lg:hidden"
          @click="emit('toggleSidebar')"
        >
          <Menu class="w-5 h-5" />
        </button>

        <!-- Search -->
        <div class="hidden sm:flex items-center">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              type="text"
              placeholder="Search..."
              class="input input-bordered input-sm w-64 pl-10 bg-base-200 focus:bg-base-100"
            />
          </div>
        </div>
      </div>

      <!-- Right Section -->
      <div class="flex items-center gap-2">
        <!-- Theme Toggle -->
        <button 
          class="btn btn-ghost btn-sm btn-square"
          @click="toggleTheme"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <Sun v-if="isDark" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>

        <!-- Notifications -->
        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-sm btn-square">
            <div class="indicator">
              <Bell class="w-5 h-5" />
              <span class="indicator-item badge badge-primary badge-xs">3</span>
            </div>
          </button>
          <div tabindex="0" class="dropdown-content z-50 mt-3 card card-compact w-80 bg-base-100 shadow-xl border border-base-300">
            <div class="card-body">
              <h3 class="font-semibold text-base-content">Notifications</h3>
              <div class="divider my-1"></div>
              <div class="space-y-3">
                <div class="flex gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer">
                  <div class="w-2 h-2 mt-2 bg-primary rounded-full"></div>
                  <div class="flex-1">
                    <p class="text-sm font-medium">New user registered</p>
                    <p class="text-xs text-base-content/60">2 minutes ago</p>
                  </div>
                </div>
                <div class="flex gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer">
                  <div class="w-2 h-2 mt-2 bg-success rounded-full"></div>
                  <div class="flex-1">
                    <p class="text-sm font-medium">Report generated</p>
                    <p class="text-xs text-base-content/60">1 hour ago</p>
                  </div>
                </div>
                <div class="flex gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer">
                  <div class="w-2 h-2 mt-2 bg-warning rounded-full"></div>
                  <div class="flex-1">
                    <p class="text-sm font-medium">System update available</p>
                    <p class="text-xs text-base-content/60">3 hours ago</p>
                  </div>
                </div>
              </div>
              <div class="divider my-1"></div>
              <button class="btn btn-ghost btn-sm w-full">View all notifications</button>
            </div>
          </div>
        </div>

        <!-- User Menu -->
        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-sm gap-2">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-8">
                <span class="text-sm">{{ user?.name?.charAt(0) || 'U' }}</span>
              </div>
            </div>
            <span class="hidden md:inline font-medium">{{ user?.name || 'User' }}</span>
            <ChevronDown class="w-4 h-4" />
          </button>
          <ul tabindex="0" class="dropdown-content z-50 mt-3 menu p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-300">
            <li class="menu-title px-4 py-2">
              <span class="text-xs text-base-content/60">{{ user?.email }}</span>
            </li>
            <li><NuxtLink to="/dashboard/settings/profile">Profile</NuxtLink></li>
            <div class="divider my-1"></div>
            <li>
              <button @click="handleLogout" :disabled="loading" class="text-error">
                <LogOut class="w-4 h-4" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>
