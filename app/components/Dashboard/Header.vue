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
          class="btn btn-ghost btn-sm btn-square"
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
              placeholder="Cari..."
              class="input input-bordered input-sm w-64 pl-10 bg-base-200 focus:bg-base-100"
            />
          </div>
        </div>
      </div>

      <!-- Right Section -->
      <div class="flex items-center gap-2">
        <!-- Theme Toggle -->
        <button 
          class="btn btn-ghost btn-primary btn-square"
          @click="toggleTheme"
          :title="isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
        >
          <Sun v-if="isDark" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>

        <!-- User Menu -->
        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-primary gap-2">
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
            <li><NuxtLink to="/dashboard/settings/profile">Profil</NuxtLink></li>
            <div class="divider my-1"></div>
            <li>
              <button @click="handleLogout" :disabled="loading" class="text-error">
                <LogOut class="w-4 h-4" />
                Keluar
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>
