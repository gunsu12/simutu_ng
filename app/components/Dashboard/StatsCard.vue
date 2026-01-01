<script setup lang="ts">
import { TrendingUp, TrendingDown } from 'lucide-vue-next'

interface Props {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: any
  iconBgColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  changeLabel: 'vs last month',
  iconBgColor: 'bg-primary/10'
})

const isPositive = computed(() => (props.change ?? 0) >= 0)
</script>

<template>
  <div class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
    <div class="card-body p-5">
      <div class="flex items-start justify-between">
        <div class="space-y-2">
          <p class="text-sm font-medium text-base-content/60">{{ title }}</p>
          <p class="text-2xl font-bold text-base-content">{{ value }}</p>
          <div v-if="change !== undefined" class="flex items-center gap-1">
            <span 
              class="flex items-center gap-0.5 text-sm font-medium"
              :class="isPositive ? 'text-success' : 'text-error'"
            >
              <TrendingUp v-if="isPositive" class="w-4 h-4" />
              <TrendingDown v-else class="w-4 h-4" />
              {{ Math.abs(change) }}%
            </span>
            <span class="text-xs text-base-content/50">{{ changeLabel }}</span>
          </div>
        </div>
        <div 
          class="w-12 h-12 rounded-xl flex items-center justify-center"
          :class="iconBgColor"
        >
          <component :is="icon" class="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  </div>
</template>
