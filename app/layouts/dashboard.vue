<script setup lang="ts">
const { initTheme } = useTheme()

const sidebarOpen = ref(false)

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-base-100">
    <DashboardSidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />
    
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
