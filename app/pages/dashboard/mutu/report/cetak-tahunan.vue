<script setup lang="ts">
import { Printer, ArrowLeft, Calendar, Download } from 'lucide-vue-next'
import * as XLSX from 'xlsx'

definePageMeta({
  layout: false,
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

// Route params
const route = useRoute()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const selectedYear = ref(parseInt(route.query.year as string) || new Date().getFullYear())
const selectedCategoryId = ref((route.query.categoryId as string) || '')
const selectedFrequency = ref((route.query.frequency as string) || 'monthly')
const categories = ref<Category[]>([])
const unitGroups = ref<UnitGroup[]>([])

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

// Years for dropdown
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
  error.value = null
  
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
    } else {
      error.value = response.message || 'Gagal memuat laporan'
    }
  } catch (err: any) {
    console.error('Failed to fetch report:', err)
    error.value = err.message || 'Gagal memuat laporan'
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

// Get cell style based on achievement
function getCellStyle(result: MonthlyResult): string {
  if (result.capaian === null) return ''
  return result.achieved ? 'color: #16a34a;' : 'color: #dc2626; font-weight: 600;'
}

// Print report
function printReport() {
  window.print()
}

// Export Excel
function exportExcel() {
  // Define headers
  const headers = [
    'NO',
    'JUDUL INDIKATOR MUTU',
    'UNIT/PIC',
    'Target',
    ...months
  ]

  const data: any[][] = [headers]

  // Add data rows
  unitGroups.value.forEach(group => {
    group.indicators.forEach(row => {
      const rowData = [
        row.no,
        row.judul,
        row.unitName,
        formatTarget(row),
        ...row.monthlyResults.map(r => formatCapaian(r, row.targetUnit))
      ]
      data.push(rowData)
    })

    // Add summary row for the group
    const summaryRow = [
      '',
      'Indikator tidak mencapai target',
      '',
      '',
      ...group.notAchievedCount.map(count => count > 0 ? count : '-')
    ]
    data.push(summaryRow)
    
    // Add empty row separator
    data.push([])
  })

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Adjust column widths
  const colWidths = [
    { wch: 5 },  // NO
    { wch: 50 }, // JUDUL
    { wch: 20 }, // UNIT
    { wch: 15 }, // Target
    ...months.map(() => ({ wch: 8 })) // Months
  ]
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Tahunan')

  // Generate filename
  const now = new Date()
  const timestamp = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') + '-' +
    String(now.getMinutes()).padStart(2, '0') + '-' +
    String(now.getSeconds()).padStart(2, '0')
  const filename = `Laporan_Mutu_Tahunan_${selectedYear.value}_${timestamp}.xlsx`

  // Save file
  XLSX.writeFile(wb, filename)
}

// Get selected category name
const selectedCategoryName = computed(() => {
  if (!selectedCategoryId.value) return 'Semua Kategori'
  const cat = categories.value.find(c => c.id === selectedCategoryId.value)
  return cat?.name || 'Semua Kategori'
})

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
  <div class="min-h-screen bg-gray-100 print:bg-white">
    <!-- Print Controls (hidden when printing) -->
    <div class="print:hidden bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <NuxtLink to="/dashboard/mutu/report/tahunan" class="btn btn-ghost btn-sm gap-2">
              <ArrowLeft class="w-4 h-4" />
              Kembali
            </NuxtLink>
            <h1 class="text-lg font-semibold">Laporan Mutu Tahunan</h1>
          </div>
          
          <div class="flex flex-wrap items-center gap-3">
            <!-- Year Selector -->
            <select v-model="selectedYear" class="select select-bordered select-sm w-28">
              <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
            </select>
            
            <!-- Category Selector -->
            <select v-model="selectedCategoryId" class="select select-bordered select-sm w-48">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            
            <!-- Frequency Selector -->
            <select v-model="selectedFrequency" class="select select-bordered select-sm w-32">
              <option value="monthly">Bulanan</option>
              <option value="daily">Harian</option>
            </select>
            
            <!-- Export Excel Button -->
             <button 
              @click="exportExcel" 
              class="btn btn-success btn-sm gap-2 text-white"
              :disabled="unitGroups.length === 0"
            >
              <Download class="w-4 h-4" />
              Excel
            </button>

            <!-- Print Button -->
            <button 
              @click="printReport" 
              class="btn btn-primary btn-sm gap-2"
              :disabled="unitGroups.length === 0"
            >
              <Printer class="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Content -->
    <div class="max-w-[297mm] mx-auto p-4 print:p-0 print:max-w-none">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-96">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="flex flex-col items-center justify-center h-96 text-center">
        <p class="text-error text-lg mb-4">{{ error }}</p>
        <button @click="fetchReport" class="btn btn-primary">Coba Lagi</button>
      </div>
      
      <!-- No Data State -->
      <div v-else-if="unitGroups.length === 0" class="flex flex-col items-center justify-center h-96 text-center print:hidden">
        <Calendar class="w-16 h-16 text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Tidak ada data indikator untuk periode ini</p>
      </div>
      
      <!-- Report -->
      <div v-else class="bg-white shadow-lg print:shadow-none p-6 print:p-4">
        <!-- Report Title -->
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold text-gray-900">
            JANUARI - DESEMBER TAHUN {{ selectedYear }}
          </h1>
          <p class="text-sm text-gray-600 mt-1">
            Kategori: {{ selectedCategoryName }} | Frekuensi: {{ selectedFrequency === 'monthly' ? 'Bulanan' : 'Harian' }}
          </p>
        </div>
        
        <!-- Report Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-10">NO</th>
                <th class="border border-gray-400 px-2 py-2 text-left font-semibold min-w-[200px]">JUDUL INDIKATOR MUTU</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold min-w-[120px]">UNIT/PIC</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-14">Target</th>
                <th v-for="(m, idx) in months" :key="idx" class="border border-gray-400 px-1 py-2 text-center font-semibold w-12">
                  {{ m }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in unitGroups" :key="group.unitId">
                <!-- Indicator Rows -->
                <tr v-for="row in group.indicators" :key="row.indicatorId" class="align-top">
                  <td class="border border-gray-400 px-2 py-1 text-center">{{ row.no }}</td>
                  <td class="border border-gray-400 px-2 py-1">{{ row.judul }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-center">{{ row.unitName }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-center">{{ formatTarget(row) }}</td>
                  <td 
                    v-for="(result, idx) in row.monthlyResults" 
                    :key="idx" 
                    class="border border-gray-400 px-1 py-1 text-center"
                    :style="getCellStyle(result)"
                  >
                    {{ formatCapaian(result, row.targetUnit) }}
                  </td>
                </tr>
                
                <!-- Not Achieved Summary Row -->
                <tr class="bg-gray-200 font-semibold">
                  <td colspan="4" class="border border-gray-400 px-2 py-1 text-left">
                    Indikator tidak mencapai target
                  </td>
                  <td 
                    v-for="(count, idx) in group.notAchievedCount" 
                    :key="idx" 
                    class="border border-gray-400 px-1 py-1 text-center"
                    :style="count > 0 ? 'color: #dc2626;' : ''"
                  >
                    {{ count > 0 ? count : '-' }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="mt-8 text-right text-sm text-gray-600">
          <p>Dicetak pada: {{ new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
  
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  .print\\:hidden {
    display: none !important;
  }
  
  .print\\:bg-white {
    background-color: white !important;
  }
  
  .print\\:shadow-none {
    box-shadow: none !important;
  }
  
  .print\\:p-0 {
    padding: 0 !important;
  }
  
  .print\\:p-4 {
    padding: 1rem !important;
  }
  
  .print\\:max-w-none {
    max-width: none !important;
  }
  
  table {
    font-size: 8px !important;
  }
  
  th, td {
    padding: 2px 4px !important;
  }
}
</style>
