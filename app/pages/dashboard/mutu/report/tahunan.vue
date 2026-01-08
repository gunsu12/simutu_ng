<script setup lang="ts">
import { Calendar, Download, Filter, Printer } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface MonthlyResult {
  month: number
  capaian: number | null
  achieved: boolean
}

interface ReportRow {
  no: number
  indicatorId: string
  code: string
  judul: string
  unitId: string
  unitName: string
  target: number | null
  targetKeterangan: string | null
  targetUnit: string | null
  monthlyResults: MonthlyResult[]
}

interface UnitGroup {
  unitId: string
  unitName: string
  indicators: ReportRow[]
  notAchievedCount: number[]
}

interface Category {
  id: string
  name: string
}

// State
const loading = ref(false)
const selectedYear = ref(new Date().getFullYear())
const selectedCategoryId = ref('')
const selectedFrequency = ref('monthly')
const categories = ref<Category[]>([])
const unitGroups = ref<UnitGroup[]>([])

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

// Years for dropdown (current year - 5 to current year + 1)
const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const yearsList = []
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    yearsList.push(y)
  }
  return yearsList
})

// Fetch report data
async function fetchReport() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      year: selectedYear.value.toString(),
      frequency: selectedFrequency.value,
    })
    
    if (selectedCategoryId.value) {
      params.append('categoryId', selectedCategoryId.value)
    }

    const response = await $fetch<{
      success: boolean
      data: {
        year: number
        frequency: string
        categories: Category[]
        unitGroups: UnitGroup[]
      }
      message?: string
    }>(`/api/reports/yearly-summary?${params.toString()}`)

    if (response.success) {
      categories.value = response.data.categories
      unitGroups.value = response.data.unitGroups
    }
  } catch (error) {
    console.error('Failed to fetch report:', error)
  } finally {
    loading.value = false
  }
}

// Format capaian for display
function formatCapaian(result: MonthlyResult, targetUnit: string | null): string {
  if (result.capaian === null) return '-'
  const unit = targetUnit === 'percentage' ? '%' : ''
  return `${result.capaian.toFixed(2)}${unit}`
}

// Format target for display
function formatTarget(row: ReportRow): string {
  if (row.target === null) return '-'
  const keterangan = row.targetKeterangan || '>='
  const unit = row.targetUnit === 'percentage' ? '%' : ''
  return `${keterangan}${row.target}${unit}`
}

// Get cell class based on achievement
function getCellClass(result: MonthlyResult): string {
  if (result.capaian === null) return ''
  return result.achieved ? 'text-success' : 'text-error font-semibold'
}

// Navigate to print page
function goToPrint() {
  const query: any = {
    year: selectedYear.value,
    frequency: selectedFrequency.value,
  }
  if (selectedCategoryId.value) {
    query.categoryId = selectedCategoryId.value
  }
  navigateTo({
    path: '/dashboard/mutu/report/cetak-tahunan',
    query
  })
}

// Watch for filter changes
watch([selectedYear, selectedCategoryId, selectedFrequency], () => {
  fetchReport()
})

// Initial load
onMounted(() => {
  fetchReport()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Mutu Tahunan</h1>
        <p class="text-base-content/60 mt-1">Rekap capaian mutu per tahun berdasarkan unit.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <!-- Year Filter -->
        <select v-model="selectedYear" class="select select-bordered select-sm w-28">
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
        
        <!-- Category Filter -->
        <select v-model="selectedCategoryId" class="select select-bordered select-sm w-48">
          <option value="">Semua Kategori</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        
        <!-- Frequency Filter -->
        <select v-model="selectedFrequency" class="select select-bordered select-sm w-32">
          <option value="monthly">Bulanan</option>
          <option value="daily">Harian</option>
        </select>
        
        <!-- Print Button -->
        <button @click="goToPrint" class="btn btn-primary btn-sm gap-2">
          <Printer class="w-4 h-4" />
          Cetak
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Report Table -->
    <div v-else-if="unitGroups.length > 0" class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-sm table-zebra">
          <thead class="bg-base-200">
            <tr>
              <th class="text-center w-12">NO</th>
              <th class="min-w-[250px]">JUDUL INDIKATOR MUTU</th>
              <th class="min-w-[150px]">UNIT/PIC</th>
              <th class="text-center w-20">Target</th>
              <th v-for="(m, idx) in months" :key="idx" class="text-center w-16">{{ m }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in unitGroups" :key="group.unitId">
              <!-- Indicator Rows -->
              <tr v-for="row in group.indicators" :key="row.indicatorId">
                <td class="text-center">{{ row.no }}</td>
                <td>{{ row.judul }}</td>
                <td>{{ row.unitName }}</td>
                <td class="text-center">{{ formatTarget(row) }}</td>
                <td 
                  v-for="(result, idx) in row.monthlyResults" 
                  :key="idx" 
                  class="text-center"
                  :class="getCellClass(result)"
                >
                  {{ formatCapaian(result, row.targetUnit) }}
                </td>
              </tr>
              
              <!-- Not Achieved Summary Row -->
              <tr class="bg-base-200/50 font-semibold">
                <td colspan="4" class="text-left">Indikator tidak mencapai target</td>
                <td 
                  v-for="(count, idx) in group.notAchievedCount" 
                  :key="idx" 
                  class="text-center"
                  :class="count > 0 ? 'text-error' : ''"
                >
                  {{ count > 0 ? count : '-' }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center h-64 text-center">
      <Calendar class="w-16 h-16 text-gray-400 mb-4" />
      <p class="text-gray-500 text-lg">Tidak ada data indikator untuk periode ini</p>
    </div>
  </div>
</template>
