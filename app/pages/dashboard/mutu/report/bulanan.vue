<script setup lang="ts">
import { Calendar, Printer } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const selectedMonth = ref(new Date().toISOString().slice(0, 7))

interface UnitReport {
  unit: string
  unitId: string
  indicators: number
  achieved: number
  percentage: number
}

const reportData = ref<UnitReport[]>([])
const units = ref<any[]>([])
const loading = ref(false)

// Fetch data
async function fetchData() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: UnitReport[] }>('/api/reports/summary', {
      query: { 
        frequency: 'monthly',
        period: selectedMonth.value
      }
    })
    if (response.success) {
      reportData.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch summary:', error)
  } finally {
    loading.value = false
  }
}

// Watch for month change
watch(selectedMonth, () => {
  fetchData()
})

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
  fetchData()
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
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-10">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 text-center">
          <p class="text-sm text-base-content/60">Total Indikator</p>
          <p class="text-2xl font-bold">{{ totalIndicators }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 text-center">
          <p class="text-sm text-base-content/60">Tercapai</p>
          <p class="text-2xl font-bold text-success">{{ totalAchieved }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 text-center">
          <p class="text-sm text-base-content/60">Persentase Capaian</p>
          <p class="text-2xl font-bold text-primary">{{ overallPercentage }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>
