<script setup lang="ts">
definePageMeta({
  layout: false
})

// Redirect to dashboard (middleware will handle auth check)
navigateTo('/dashboard')
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
</template>
