<script setup lang="ts">
import { Printer, Download, ArrowLeft, Calendar } from 'lucide-vue-next'

definePageMeta({
  layout: false, // No layout for printable page
  middleware: 'auth'
})

const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')

// Report data types
interface ReportItem {
  indicatorId: string
  code: string
  judul: string
  numerator: string | null
  denominator: string | null
  numeratorValue: number | null
  denominatorValue: number | null
  bobot: number
  hasil: number | null
  capaian: number | null
  standar: number | null
  standarUnit: string | null
  standarKeterangan: string | null
  skor: number | null
  point: number | null
  isNeedPDCA: boolean
  status: string
  notes: string | null
  pic?: string
}

interface ReportData {
  site: {
    id: string
    name: string
    address: string
    logo: string | null
  }
  unit: {
    id: string
    name: string
    code: string
    headOfUnit: string | null
  }
  period: {
    day: number
    month: number
    year: number
    monthName: string
    formatted: string
  }
  items: ReportItem[]
  generatedAt: string
}

// Route params
const route = useRoute()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const reportData = ref<ReportData | null>(null)
const units = ref<any[]>([])
const loadingUnits = ref(false)
const unitSearchQuery = ref('')
const unitTotalPages = ref(1)
const unitCurrentPage = ref(1)
const unitInput = ref<HTMLInputElement | null>(null)
const unitNameSelect = ref('')

// Filter state
const selectedUnitId = ref((route.query.unitId as string) || '')
const selectedDate = ref((route.query.date as string) || new Date().toISOString().split('T')[0])

// Fetch units
async function fetchUnits(search = '', page = 1, fetchById = '') {
  loadingUnits.value = true
  try {
    const response = await $fetch<{ 
      success: boolean; 
      data: any[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/units', {
      query: { search, page, limit: 10, id: fetchById }
    })
    
    if (response.success) {
      if (fetchById) {
        if (response.data.length > 0) {
          unitNameSelect.value = response.data[0].name
          if (!selectedUnitId.value) selectedUnitId.value = response.data[0].id
        }
      } else {
        units.value = response.data
        unitTotalPages.value = response.meta.totalPages
        unitCurrentPage.value = response.meta.page
        
        // Auto-select first unit if none selected and not searching
        if (!selectedUnitId.value && units.value.length > 0 && !search) {
          if (!isAdmin.value && user.value?.unitId) {
            // Find user unit in current list if possible
            const myUnit = units.value.find(u => u.id === user.value?.unitId)
            if (myUnit) {
              selectedUnitId.value = myUnit.id
              unitNameSelect.value = myUnit.name
            }
          } else {
            const firstUnit = units.value[0]
            selectedUnitId.value = firstUnit.id
            unitNameSelect.value = firstUnit.name
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to fetch units:', err)
  } finally {
    loadingUnits.value = false
  }
}

// Handle unit search with debounce
let unitSearchTimeout: ReturnType<typeof setTimeout> | null = null
const handleUnitSearch = () => {
  if (unitSearchTimeout) clearTimeout(unitSearchTimeout)
  unitSearchTimeout = setTimeout(() => {
    fetchUnits(unitSearchQuery.value)
  }, 500)
}

// Fetch report data
async function fetchReport() {
  if (!selectedUnitId.value || !selectedDate.value) {
    error.value = 'Please select a unit and date'
    return
  }

  loading.value = true
  error.value = null
  
  try {
    const response = await $fetch<{ success: boolean; data: ReportData; message?: string }>(
      `/api/reports/unit-daily?unitId=${selectedUnitId.value}&date=${selectedDate.value}`
    )
    
    if (response.success) {
      reportData.value = response.data
    } else {
      error.value = response.message || 'Failed to load report data'
    }
  } catch (err: any) {
    console.error('Failed to fetch report:', err)
    error.value = err.data?.message || err.message || 'Failed to load report data'
  } finally {
    loading.value = false
  }
}

// Print report
function printReport() {
  window.print()
}

// Format date for display
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `Denpasar, ${day} ${month} ${year}`
}

// Format standar display
function formatStandar(item: ReportItem) {
  if (item.standar === null) return '-'
  const keterangan = item.standarKeterangan || '>='
  const unit = item.standarUnit === 'percentage' ? '%' : (item.standarUnit || '')
  return `${keterangan} ${item.standar} ${unit}`
}

// Format capaian display
function formatCapaian(item: ReportItem) {
  if (item.capaian === null) return '-'
  const unit = item.standarUnit === 'percentage' ? ' %' : ''
  return `${item.capaian.toFixed(item.standarUnit === 'percentage' ? 0 : 2)}${unit}`
}

// Get status display
function getStatusDisplay(status: string) {
  switch (status) {
    case 'proposed': return 'On Progress'
    case 'checked': return 'On Progress'
    case 'pending': return 'On Progress'
    case 'finish': return 'Closed'
    default: return status
  }
}

// Watch for filter changes
watch([selectedUnitId, selectedDate], () => {
  if (selectedUnitId.value && selectedDate.value) {
    fetchReport()
  }
})

// Initial load
onMounted(async () => {
  // If not admin, override selectedUnitId with user's unitId
  if (!isAdmin.value && user.value?.unitId) {
    selectedUnitId.value = user.value.unitId
  }

  if (selectedUnitId.value) {
    // Specifically fetch the unit name
    await fetchUnits('', 1, selectedUnitId.value)
  } else {
    await fetchUnits()
  }
  
  if (selectedUnitId.value && selectedDate.value) {
    await fetchReport()
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 print:bg-white">
    <!-- Print Controls (hidden when printing) -->
    <div class="print:hidden bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <NuxtLink to="/dashboard/mutu/report/harian" class="btn btn-ghost btn-sm gap-2">
              <ArrowLeft class="w-4 h-4" />
              Kembali
            </NuxtLink>
            <h1 class="text-lg font-semibold">Laporan Mutu Indikator Unit Harian</h1>
          </div>
          
          <div class="flex flex-wrap items-center gap-3">
            <!-- Unit Selector (Admin only) -->
            <div class="form-control" v-if="isAdmin">
              <div class="dropdown dropdown-end">
                <div class="relative">
                  <input
                    ref="unitInput"
                    v-model="unitNameSelect"
                    type="text"
                    placeholder="Cari Unit..."
                    class="input input-bordered input-sm w-64"
                    @input="(e) => { 
                      unitSearchQuery = (e.target as HTMLInputElement).value;
                      handleUnitSearch();
                    }"
                    @focus="() => { if (!unitSearchQuery) fetchUnits() }"
                  />
                  <div v-if="loadingUnits" class="absolute right-8 top-1/2 -translate-y-1/2">
                    <span class="loading loading-spinner loading-xs"></span>
                  </div>
                </div>
                
                <ul class="dropdown-content z-[20] menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto mt-1 border border-base-content/10">
                  <li v-if="units.length === 0 && !loadingUnits">
                    <a class="text-base-content/50">No units found</a>
                  </li>
                  <li v-for="unit in units" :key="unit.id">
                    <button 
                      type="button"
                      @click="() => { 
                        selectedUnitId = unit.id; 
                        unitNameSelect = unit.name;
                        (unitInput as any)?.blur();
                      }"
                      :class="{ 'active': selectedUnitId === unit.id }"
                    >
                      <div class="flex flex-col items-start">
                        <span class="font-medium text-xs">{{ unit.name }}</span>
                        <span class="text-[10px] opacity-50">{{ unit.unitCode }}</span>
                      </div>
                    </button>
                  </li>
                  <li v-if="unitTotalPages > 1" class="border-t border-base-content/10 mt-2 pt-2">
                    <div class="flex justify-between items-center px-4 py-2">
                      <button 
                        type="button"
                        class="btn btn-xs" 
                        :disabled="unitCurrentPage === 1 || loadingUnits"
                        @click.stop="fetchUnits(unitSearchQuery, unitCurrentPage - 1)"
                      >«</button>
                      <span class="text-[10px]">Page {{ unitCurrentPage }} of {{ unitTotalPages }}</span>
                      <button 
                        type="button"
                        class="btn btn-xs" 
                        :disabled="unitCurrentPage === unitTotalPages || loadingUnits"
                        @click.stop="fetchUnits(unitSearchQuery, unitCurrentPage + 1)"
                      >»</button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div v-else class="flex flex-col px-2">
               <span class="text-sm font-bold text-primary">{{ unitNameSelect || 'Unit Anda' }}</span>
               <span class="text-[10px] opacity-60">Unit Terpilih</span>
            </div>
            
            <!-- Date Selector -->
            <div class="form-control">
              <input
                v-model="selectedDate"
                type="date"
                class="input input-bordered input-sm w-40"
              />
            </div>
            
            <!-- Print Button -->
            <button 
              @click="printReport" 
              class="btn btn-primary btn-sm gap-2"
              :disabled="!reportData"
            >
              <Printer class="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Content -->
    <div class="max-w-[210mm] mx-auto p-8 print:p-0 print:max-w-none">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-96">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="flex flex-col items-center justify-center h-96 text-center">
        <p class="text-error text-lg mb-4">{{ error }}</p>
        <button @click="fetchReport" class="btn btn-primary">
          Coba Lagi
        </button>
      </div>
      
      <!-- No Data State -->
      <div v-else-if="!reportData" class="flex flex-col items-center justify-center h-96 text-center print:hidden">
        <Calendar class="w-16 h-16 text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Pilih unit dan tanggal untuk melihat laporan</p>
      </div>
      
      <!-- Report -->
      <div v-else class="bg-white shadow-lg print:shadow-none p-8 print:p-6">
        <!-- Header -->
        <div class="flex items-start gap-4 mb-6 pb-4 border-b-2 border-gray-800">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <img 
              v-if="reportData.site.logo"
              :src="reportData.site.logo"
              alt="Hospital Logo"
              class="w-20 h-20 object-contain"
            />
            <div v-else class="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
              <span class="text-gray-500 text-xs">Logo</span>
            </div>
          </div>
          
          <!-- Hospital Info -->
          <div class="flex-1 text-center">
            <h1 class="text-2xl font-bold text-gray-900">{{ reportData.site.name }}</h1>
            <p class="text-sm text-gray-600 mt-1">{{ reportData.site.address }}</p>
          </div>
          
          <!-- Spacer for symmetry -->
          <div class="w-20"></div>
        </div>
        
        <!-- Report Title -->
        <div class="text-center mb-6">
          <h2 class="text-lg font-bold text-gray-900">
            Laporan Mutu Indikator Unit Tanggal {{ reportData.period.formatted }}
            Pada Unit {{ reportData.unit.name }}
          </h2>
        </div>
        
        <!-- Report Table -->
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-sm border-collapse border border-gray-400">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-16">Kode</th>
                <th class="border border-gray-400 px-2 py-2 text-left font-semibold w-40">Indikator</th>
                <th class="border border-gray-400 px-2 py-2 text-left font-semibold w-40">Numerator (N) & Denominator (D)</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-14">Bobot</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-14">Hasil</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-16">Capaian</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-16">Standar</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-14">Skor</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-14">Point</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-14">PDCA</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-24">PIC</th>
                <th class="border border-gray-400 px-2 py-2 text-center font-semibold w-20">Status On Progress / Closed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in reportData.items" :key="item.indicatorId" class="align-top">
                <td class="border border-gray-400 px-2 py-2 text-center">{{ item.code }}</td>
                <td class="border border-gray-400 px-2 py-2">{{ item.judul }}</td>
                <td class="border border-gray-400 px-2 py-2 text-xs">
                  <div v-if="item.numerator || item.denominator">
                    <div v-if="item.numerator" class="mb-1">
                      <span class="font-semibold">N:</span> {{ item.numerator }}
                    </div>
                    <div v-if="item.denominator">
                      <span class="font-semibold">D:</span> {{ item.denominator }}
                    </div>
                  </div>
                  <span v-else>-</span>
                </td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ item.bobot || '-' }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ item.hasil !== null ? item.hasil.toFixed(2) : '-' }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ formatCapaian(item) }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ formatStandar(item) }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ item.skor !== null ? item.skor.toFixed(0) : '-' }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ item.point !== null ? item.point : '-' }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">
                  <span v-if="item.isNeedPDCA" class="text-red-600 font-semibold">Ya</span>
                  <span v-else>-</span>
                </td>
                <td class="border border-gray-400 px-2 py-2 text-center text-xs">{{ item.pic || reportData.unit.headOfUnit || '-' }}</td>
                <td class="border border-gray-400 px-2 py-2 text-center">{{ getStatusDisplay(item.status) }}</td>
              </tr>
              
              <!-- Empty state -->
              <tr v-if="reportData.items.length === 0">
                <td colspan="12" class="border border-gray-400 px-4 py-8 text-center text-gray-500">
                  Tidak ada data indikator untuk tanggal ini
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Signature Section -->
        <div class="mt-12">
          <p class="text-sm mb-8">{{ formatDate(reportData.generatedAt) }}</p>
          <p class="text-sm mb-2">Mengetahui,</p>
          
          <div class="grid grid-cols-3 gap-8 mt-6">
            <!-- Ketua Komite Mutu -->
            <div class="text-center">
              <p class="font-semibold text-sm mb-16">Ketua Komite Mutu</p>
              <div class="border-b border-gray-800 mx-4"></div>
              <p class="text-sm mt-1">&nbsp;</p>
            </div>
            
            <!-- Manajer -->
            <div class="text-center">
              <p class="font-semibold text-sm mb-16">Manajer</p>
              <div class="border-b border-gray-800 mx-4"></div>
              <p class="text-sm mt-1">&nbsp;</p>
            </div>
            
            <!-- Kepala Unit -->
            <div class="text-center">
              <p class="font-semibold text-sm mb-16">Kepala Unit {{ reportData.unit.name }}</p>
              <div class="border-b border-gray-800 mx-4"></div>
              <p class="text-sm mt-1">{{ reportData.unit.headOfUnit || '&nbsp;' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm;
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
  
  .print\\:p-6 {
    padding: 1.5rem !important;
  }
  
  .print\\:max-w-none {
    max-width: none !important;
  }
  
  table {
    font-size: 10px !important;
  }
  
  th, td {
    padding: 4px 6px !important;
  }
}
</style>
