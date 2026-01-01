<script setup lang="ts">
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Activity, Calendar } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const metrics = [
  { label: 'Page Views', value: '124,523', change: 12.5, positive: true },
  { label: 'Unique Visitors', value: '45,234', change: 8.3, positive: true },
  { label: 'Bounce Rate', value: '32.4%', change: -5.2, positive: true },
  { label: 'Avg. Session', value: '4m 32s', change: -2.1, positive: false }
]

const topPages = [
  { path: '/dashboard', views: 12453, percentage: 28 },
  { path: '/products', views: 8234, percentage: 18 },
  { path: '/about', views: 5621, percentage: 12 },
  { path: '/contact', views: 4532, percentage: 10 },
  { path: '/blog', views: 3421, percentage: 8 }
]

const trafficSources = [
  { source: 'Direct', visits: 35, color: 'bg-primary' },
  { source: 'Organic Search', visits: 28, color: 'bg-success' },
  { source: 'Social Media', visits: 22, color: 'bg-warning' },
  { source: 'Referral', visits: 15, color: 'bg-info' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Analytics</h1>
        <p class="text-base-content/60 mt-1">Track your website performance and user behavior.</p>
      </div>
      <div class="flex items-center gap-2">
        <select class="select select-bordered select-sm">
          <option>Last 7 days</option>
          <option selected>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This Year</option>
        </select>
        <button class="btn btn-primary btn-sm gap-2">
          <Calendar class="w-4 h-4" />
          Custom Range
        </button>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        v-for="metric in metrics" 
        :key="metric.label"
        class="card bg-base-100 border border-base-300 shadow-sm"
      >
        <div class="card-body p-5">
          <p class="text-sm font-medium text-base-content/60">{{ metric.label }}</p>
          <p class="text-2xl font-bold mt-1">{{ metric.value }}</p>
          <div class="flex items-center gap-1 mt-2">
            <TrendingUp v-if="metric.change > 0" class="w-4 h-4" :class="metric.positive ? 'text-success' : 'text-error'" />
            <TrendingDown v-else class="w-4 h-4" :class="metric.positive ? 'text-success' : 'text-error'" />
            <span class="text-sm" :class="metric.positive ? 'text-success' : 'text-error'">
              {{ Math.abs(metric.change) }}%
            </span>
            <span class="text-xs text-base-content/50">vs last period</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Traffic Chart Placeholder -->
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-lg">Traffic Overview</h2>
          <div class="h-64 bg-base-200/50 rounded-lg flex items-center justify-center mt-4">
            <div class="text-center text-base-content/50">
              <Activity class="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Line chart will render here</p>
              <p class="text-sm">Integrate with Chart.js</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Traffic Sources -->
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-lg">Traffic Sources</h2>
          <div class="space-y-4 mt-4">
            <div v-for="source in trafficSources" :key="source.source">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">{{ source.source }}</span>
                <span class="text-sm text-base-content/60">{{ source.visits }}%</span>
              </div>
              <div class="w-full bg-base-200 rounded-full h-2">
                <div 
                  :class="source.color"
                  class="h-2 rounded-full transition-all"
                  :style="{ width: `${source.visits}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Pages -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body">
        <h2 class="card-title text-lg mb-4">Top Pages</h2>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
                <th>Traffic Share</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="page in topPages" :key="page.path">
                <td class="font-mono text-sm">{{ page.path }}</td>
                <td>{{ page.views.toLocaleString() }}</td>
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-24 bg-base-200 rounded-full h-2">
                      <div 
                        class="bg-primary h-2 rounded-full"
                        :style="{ width: `${page.percentage}%` }"
                      ></div>
                    </div>
                    <span class="text-sm text-base-content/60">{{ page.percentage }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
