<script setup lang="ts">
const { toasts } = useToast()
</script>

<template>
  <div class="toast toast-end toast-bottom z-[99999]" v-if="toasts.length > 0">
    <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="alert shadow-lg transition-all duration-300 min-w-[300px]"
        :class="{
            'alert-success': toast.color === 'green',
            'alert-error': toast.color === 'red' || !toast.color,
            'alert-info': toast.color === 'blue',
            'alert-warning': toast.color === 'yellow'
        }"
    >
      <div class="flex flex-col items-start gap-1">
        <h3 class="font-bold flex items-center gap-2">
            <span v-if="toast.color === 'green'">✓</span>
            <span v-else-if="toast.color === 'red'">✕</span>
            {{ toast.title }}
        </h3>
        <div v-if="toast.description" class="text-xs opacity-90 text-left">{{ toast.description }}</div>
      </div>
    </div>
  </div>
</template>
