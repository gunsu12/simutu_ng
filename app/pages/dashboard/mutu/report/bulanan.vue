<script setup lang="ts">
import { Calendar, Download, Filter, TrendingUp, TrendingDown, Printer, Eye } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const selectedMonth = ref('2026-01')

interface UnitReport {
  id: string
  unit: string
  unitId: string
  indicators: number
  achieved: number
  percentage: number
}

const reportData = ref<UnitReport[]>([])
const units = ref<any[]>([])
const loading = ref(false)

// Fetch units
async function fetchUnits() {
  try {
    const response = await $fetch<{ success: boolean; data: any[] }>('/api/units')
    if (response.success) {
      units.value = response.data
      // Generate mock data for demo (replace with real API later)
      reportData.value = units.value.slice(0, 5).map((unit, index) => ({
        id: unit.id,
        unit: unit.name,
        unitId: unit.id,
        indicators: Math.floor(Math.random() * 8) + 3,
        achieved: Math.floor(Math.random() * 6) + 2,
        percentage: Math.round((Math.random() * 40) + 60)
      }))
    }
  } catch (error) {
    console.error('Failed to fetch units:', error)
  }
}

// Navigate to print page
function goToPrintPage(unitId?: string) {
  const query: any = { month: selectedMonth.value }
  if (unitId) {
    query.unitId = unitId
  }
  navigateTo({
    path: '/dashboard/mutu/report/cetak',
    query
  })
}

// Calculate totals
const totalIndicators = computed(() => reportData.value.reduce((sum, item) => sum + item.indicators, 0))
const totalAchieved = computed(() => reportData.value.reduce((sum, item) => sum + item.achieved, 0))
const overallPercentage = computed(() => {
  if (totalIndicators.value === 0) return 0
  return Math.round((totalAchieved.value / totalIndicators.value) * 100 * 10) / 10
})

onMounted(() => {
  fetchUnits()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Mutu Bulanan</h1>
        <p class="text-base-content/60 mt-1">Rekap capaian mutu per bulan.</p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="selectedMonth"
          type="month"
          class="input input-bordered input-sm"
        />
        <button @click="goToPrintPage()" class="btn btn-primary btn-sm gap-2">
          <Printer class="w-4 h-4" />
          Cetak Laporan
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Total Indikator</p>
          <p class="text-2xl font-bold">{{ totalIndicators }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Tercapai</p>
          <p class="text-2xl font-bold text-success">{{ totalAchieved }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Persentase Capaian</p>
          <p class="text-2xl font-bold text-primary">{{ overallPercentage }}%</p>
        </div>
      </div>
    </div>

    <!-- Report Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>Unit</th>
              <th class="text-center">Jumlah Indikator</th>
              <th class="text-center">Tercapai</th>
              <th class="text-center">Persentase</th>
              <th class="text-center">Trend</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reportData" :key="item.unitId">
              <td class="font-medium">{{ item.unit }}</td>
              <td class="text-center">{{ item.indicators }}</td>
              <td class="text-center">{{ item.achieved }}</td>
              <td class="text-center">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-24 bg-base-200 rounded-full h-2">
                    <div 
                      class="h-2 rounded-full"
                      :class="item.percentage >= 80 ? 'bg-success' : item.percentage >= 60 ? 'bg-warning' : 'bg-error'"
                      :style="{ width: `${item.percentage}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium">{{ item.percentage }}%</span>
                </div>
              </td>
              <td class="text-center">
                <TrendingUp v-if="item.percentage >= 80" class="w-4 h-4 text-success mx-auto" />
                <TrendingDown v-else class="w-4 h-4 text-error mx-auto" />
              </td>
              <td class="text-center">
                <button 
                  @click="goToPrintPage(item.unitId)" 
                  class="btn btn-ghost btn-xs gap-1"
                  title="Lihat & Cetak Laporan"
                >
                  <Eye class="w-4 h-4" />
                  Lihat
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
