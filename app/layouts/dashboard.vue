<script setup lang="ts">
const { initTheme } = useTheme()

const sidebarOpen = ref(true)
const sidebarPinned = ref(false)

onMounted(() => {
  initTheme()
  // Load pinned state from storage
  const savedPin = localStorage.getItem('sidebarPinned')
  if (savedPin !== null) {
    sidebarPinned.value = savedPin === 'true'
    // If pinned, ensure it's open
    if (sidebarPinned.value) sidebarOpen.value = true
  }
})

const togglePin = () => {
  sidebarPinned.value = !sidebarPinned.value
  localStorage.setItem('sidebarPinned', sidebarPinned.value.toString())
  if (sidebarPinned.value) {
    sidebarOpen.value = true
  }
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-base-100">
    <!-- Desktop Sidebar Wrapper -->
    <div 
      class="hidden lg:block transition-all duration-300 ease-in-out overflow-hidden"
      :class="sidebarPinned || sidebarOpen ? 'w-64' : 'w-0'"
    >
      <div class="w-64 h-full">
        <DashboardSidebar 
          :is-open="true" 
          :is-pinned="sidebarPinned"
          @close="sidebarOpen = false" 
          @toggle-pin="togglePin"
        />
      </div>
    </div>

    <!-- Mobile Sidebar -->
    <div class="lg:hidden">
      <DashboardSidebar 
        :is-open="sidebarOpen" 
        :is-pinned="false"
        @close="sidebarOpen = false" 
      />
    </div>
    
    <!-- Overlay for mobile -->
    <div 
      v-if="sidebarOpen" 
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      
      <main class="flex-1 overflow-y-auto bg-base-200/50 p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
