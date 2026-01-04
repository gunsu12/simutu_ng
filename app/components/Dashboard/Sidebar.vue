<script setup lang="ts">
import { 
  LayoutDashboard, 
  Award, 
  ClipboardList, 
  Calculator, 
  FileText, 
  Calendar, 
  CalendarDays,
  ClipboardCheck,
  Database, 
  Users, 
  Building2, 
  Boxes,
  MapPin,
  UserCog,
  Settings, 
  User,
  KeyRound,
  HelpCircle, 
  X,
  ChevronDown,
  Activity
} from 'lucide-vue-next'

interface Props {
  isOpen: boolean
}

interface MenuItem {
  name: string
  path?: string
  icon: any
  children?: MenuItem[]
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const { user } = useAuth()

// Track expanded menus - initialize with reactive state
const expandedMenus = ref<Set<string>>(new Set())
const isInitialized = ref(false)

const menuItems: MenuItem[] = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Mutu', 
    icon: Award,
    children: [
      { 
        name: 'Master', 
        icon: Database,
        children: [
          { name: 'Indicator Categories', path: '/dashboard/mutu/master/indicator-categories', icon: ClipboardList },
          { name: 'Indicator Mutu', path: '/dashboard/mutu/master/indicators', icon: Award }
        ]
      },
      { name: 'Nilai Mutu Unit', path: '/dashboard/mutu/nilai-unit', icon: Calculator },
      { name: 'Laporan Kegiatan PDCA', path: '/dashboard/mutu/pdca', icon: ClipboardCheck },
      { name: 'Verifikasi', path: '/dashboard/mutu/verifikasi', icon: ClipboardCheck },
      { 
        name: 'Report', 
        icon: FileText,
        children: [
          { name: 'Mutu Bulanan', path: '/dashboard/mutu/report/bulanan', icon: Calendar },
          { name: 'Mutu Harian', path: '/dashboard/mutu/report/harian', icon: CalendarDays }
        ]
      }
    ]
  },
  { 
    name: 'Master Data', 
    icon: Database,
    children: [
      { name: 'Employee', path: '/dashboard/master/employee', icon: Users },
      { name: 'Division', path: '/dashboard/master/division', icon: Building2 },
      { name: 'Units', path: '/dashboard/master/units', icon: Boxes },
      { name: 'Site', path: '/dashboard/master/site', icon: MapPin },
      { name: 'User Management', path: '/dashboard/master/users', icon: UserCog }
    ]
  },
  { 
    name: 'Setting', 
    icon: Settings,
    children: [
      { name: 'Profile', path: '/dashboard/settings/profile', icon: User },
      // { name: 'Update Password', path: '/dashboard/settings/password', icon: KeyRound }
    ]
  },
  { 
    name: 'Activity Logs', 
    path: '/dashboard/activity-logs', 
    icon: Activity 
  }
]

const bottomMenuItems: MenuItem[] = [
  { name: 'Help & Support', path: '/dashboard/help', icon: HelpCircle }
]

// Filter menu items based on user role
const filteredMenuItems = computed(() => {
  // While user is loading, show all menu items to prevent flash
  // The actual filtering will happen once user data is available
  if (!user.value) return menuItems
  
  // Admin can see everything
  if (user.value.role === 'admin') {
    return menuItems
  }
  
  // Helper function to filter Mutu children based on role
  const filterMutuChildren = (children: MenuItem[]): MenuItem[] => {
    return children.filter(child => {
      // Hide Master submenu for 'user' role
      if (child.name === 'Master' && user.value?.role === 'user') {
        return false
      }
      // Hide Verifikasi for 'user' role (only managers and auditors can access)
      if (child.name === 'Verifikasi' && user.value?.role === 'user') {
        return false
      }
      return true
    })
  }
  
  // User, Manager, and Auditor can only see Mutu and Settings
  // They cannot see Master Data menu and Activity Logs
  return menuItems.filter(item => {
    // Show Dashboard
    if (item.name === 'Dashboard') return true
    
    // Show Mutu menu
    if (item.name === 'Mutu') return true
    
    // Show Settings menu
    if (item.name === 'Setting') return true
    
    // Hide Master Data menu for non-admin users
    if (item.name === 'Master Data') return false
    
    // Hide Activity Logs for non-admin users
    if (item.name === 'Activity Logs') return false
    
    return true
  }).map(item => {
    // Apply the filtering for Mutu menu's children based on role
    if (item.name === 'Mutu' && item.children) {
      return {
        ...item,
        children: filterMutuChildren(item.children)
      }
    }
    return item
  })
})

const isActive = (path?: string) => {
  if (!path) return false
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

const isParentActive = (item: MenuItem): boolean => {
  if (item.path && isActive(item.path)) return true
  if (item.children) {
    return item.children.some(child => isParentActive(child))
  }
  return false
}

const toggleMenu = (name: string, event?: Event) => {
  // Prevent native details toggle behavior
  if (event) {
    event.preventDefault()
  }
  
  if (expandedMenus.value.has(name)) {
    expandedMenus.value.delete(name)
  } else {
    expandedMenus.value.add(name)
  }
}

const isExpanded = (name: string) => {
  return expandedMenus.value.has(name)
}

// Auto-expand menus based on current route (only adds, never removes)
const autoExpandMenus = (replace: boolean = false) => {
  const checkAndExpand = (items: MenuItem[]) => {
    for (const item of items) {
      if (item.children) {
        if (isParentActive(item)) {
          expandedMenus.value.add(item.name)
        }
        checkAndExpand(item.children)
      }
    }
  }
  
  if (replace) {
    // Full replacement only on initial load
    const newExpanded = new Set<string>()
    const checkAndAdd = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.children) {
          if (isParentActive(item)) {
            newExpanded.add(item.name)
          }
          checkAndAdd(item.children)
        }
      }
    }
    // Use raw menuItems for expansion check to work even before user loads
    checkAndAdd(menuItems)
    expandedMenus.value = newExpanded
  } else {
    // Just add new expansions, don't remove existing
    checkAndExpand(menuItems)
  }
  
  isInitialized.value = true
}

// Initialize expansion immediately on client side
if (import.meta.client) {
  autoExpandMenus(true)
}

onMounted(() => {
  if (!isInitialized.value) {
    autoExpandMenus(true)
  }
})

// Only expand menus on route change, don't collapse existing ones
watch(() => route.path, () => {
  autoExpandMenus(false)
})

// Re-initialize when user becomes available
watch(() => user.value, (newUser) => {
  if (newUser) {
    nextTick(() => {
      autoExpandMenus(false)
    })
  }
})
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 w-64 bg-base-200 border-r border-base-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-between h-16 px-6 border-b border-base-300">
        <NuxtLink to="/dashboard" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span class="text-primary-content font-bold text-lg">S</span>
          </div>
          <span class="text-xl font-bold text-base-content">Simutu</span>
        </NuxtLink>
        <button 
          class="btn btn-ghost btn-sm btn-square lg:hidden"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 overflow-y-auto">
        <ul class="menu menu-sm gap-1">
          <template v-for="item in filteredMenuItems" :key="item.name">
            <!-- Menu item with children -->
            <li v-if="item.children">
              <div
                class="font-medium flex items-center justify-between cursor-pointer"
                :class="isParentActive(item) ? 'text-primary' : ''"
                @click="toggleMenu(item.name)"
              >
                <span class="flex items-center gap-2">
                  <component :is="item.icon" class="w-4 h-4" />
                  {{ item.name }}
                </span>
                <ChevronDown 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="isExpanded(item.name) ? 'rotate-180' : ''"
                />
              </div>
              <ul v-show="isExpanded(item.name)" class="ml-4 mt-1">
                <template v-for="child in item.children" :key="child.name">
                  <!-- Nested children (level 3) -->
                  <li v-if="child.children">
                    <div
                      class="font-medium flex items-center justify-between cursor-pointer"
                      :class="isParentActive(child) ? 'text-primary' : ''"
                      @click="toggleMenu(child.name)"
                    >
                      <span class="flex items-center gap-2">
                        <component :is="child.icon" class="w-4 h-4" />
                        {{ child.name }}
                      </span>
                      <ChevronDown 
                        class="w-4 h-4 transition-transform duration-200" 
                        :class="isExpanded(child.name) ? 'rotate-180' : ''"
                      />
                    </div>
                    <ul v-show="isExpanded(child.name)" class="ml-4 mt-1">
                      <li v-for="grandChild in child.children" :key="grandChild.name">
                        <NuxtLink 
                          :to="grandChild.path!" 
                          :class="isActive(grandChild.path) ? 'active' : ''"
                          @click="emit('close')"
                        >
                          <component :is="grandChild.icon" class="w-4 h-4" />
                          {{ grandChild.name }}
                        </NuxtLink>
                      </li>
                    </ul>
                  </li>
                  <!-- Regular child item -->
                  <li v-else>
                    <NuxtLink 
                      :to="child.path!" 
                      :class="isActive(child.path) ? 'active' : ''"
                      @click="emit('close')"
                    >
                      <component :is="child.icon" class="w-4 h-4" />
                      {{ child.name }}
                    </NuxtLink>
                  </li>
                </template>
              </ul>
            </li>
            <!-- Simple menu item -->
            <li v-else>
              <NuxtLink 
                :to="item.path!" 
                :class="isActive(item.path) ? 'active' : ''"
                @click="emit('close')"
              >
                <component :is="item.icon" class="w-4 h-4" />
                <span class="font-medium">{{ item.name }}</span>
              </NuxtLink>
            </li>
          </template>
        </ul>
      </nav>

      <!-- Bottom Menu -->
      <div class="px-3 py-4 border-t border-base-300">
        <ul class="menu menu-sm">
          <li v-for="item in bottomMenuItems" :key="item.path">
            <NuxtLink 
              :to="item.path!" 
              :class="isActive(item.path) ? 'active' : ''"
              @click="emit('close')"
            >
              <component :is="item.icon" class="w-4 h-4" />
              <span class="font-medium">{{ item.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Menu item hover state */
.menu li > div {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}

.menu li > div:hover {
  background-color: oklch(var(--b3));
}

/* Smooth icon rotation */
.rotate-180 {
  transform: rotate(180deg);
}
</style>
