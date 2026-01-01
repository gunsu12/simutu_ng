<script setup lang="ts">
definePageMeta({
  layout: false
})

// Redirect to login page
navigateTo('/login')
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
</template>
