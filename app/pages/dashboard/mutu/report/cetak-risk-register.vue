<script setup lang="ts">
import { Printer, ArrowLeft, Calendar, Download } from 'lucide-vue-next'

definePageMeta({
  layout: false,
  middleware: 'auth'
})

interface Unit {
  id: string
  name: string
}

interface RiskRegister {
  id: string
  siteId: string
  unitId: string
  unitName: string
  tahun: number
  kategoriRisiko: string
  risiko: string
  penyebab: string
  dampak: string
  likelihood: number
  severity: number
  riskRating: number
  levelRisiko: 'Rendah' | 'Sedang' | 'Tinggi'
  mitigasi: string
  status: 'proposed' | 'approved' | 'rejected'
  creatorName: string
  createdAt: string
}

const route = useRoute()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const selectedYear = ref(parseInt(route.query.year as string) || new Date().getFullYear())
const selectedStatus = ref((route.query.status as string) || 'approved')
const selectedUnitId = ref((route.query.unitId as string) || '')
const unitsList = ref<Unit[]>([])
const risks = ref<RiskRegister[]>([])

const { user } = useAuth()
const isReviewer = computed(() => user.value?.role === 'admin' || user.value?.role === 'auditor')

const currentYear = new Date().getFullYear()
const years = computed(() => {
  const list = []
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    list.push(y)
  }
  return list
})

// Fetch units
async function fetchUnits() {
  try {
    const response = await $fetch<{ success: boolean; data: Unit[] }>('/api/units')
    if (response.success) {
      unitsList.value = response.data
    }
  } catch (err) {
    console.error('Failed to load units:', err)
  }
}

// Fetch report data
async function fetchReport() {
  loading.value = true
  error.value = null
  
  try {
    const params = new URLSearchParams({
      page: '1',
      limit: '1000', // Fetch all for printing
      tahun: selectedYear.value.toString(),
      status: selectedStatus.value,
    })
    
    if (selectedUnitId.value) {
      params.append('unitId', selectedUnitId.value)
    }

    const response = await $fetch<{
      success: boolean
      data: RiskRegister[]
      message?: string
    }>(`/api/risk-registers?${params.toString()}`)

    if (response.success) {
      risks.value = response.data
    } else {
      error.value = response.message || 'Gagal memuat laporan'
    }
  } catch (err: any) {
    console.error('Failed to fetch report data:', err)
    error.value = err.message || 'Gagal memuat laporan'
  } finally {
    loading.value = false
  }
}

// Get selected unit name
const selectedUnitName = computed(() => {
  if (!selectedUnitId.value) return 'Semua Unit'
  const unit = unitsList.value.find(u => u.id === selectedUnitId.value)
  return unit?.name || 'Semua Unit'
})

// Get status label
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    default: return 'Diajukan'
  }
}

// Get status text helper
const getStatusDescription = computed(() => {
  if (selectedStatus.value === 'approved') return 'Disetujui (Aktif)'
  if (selectedStatus.value === 'rejected') return 'Ditolak'
  if (selectedStatus.value === 'proposed') return 'Diajukan'
  return 'Semua Status'
})

// Print
function printReport() {
  window.print()
}

// Export Excel (using our previously built endpoint)
function exportExcel() {
  const params = new URLSearchParams()
  if (selectedStatus.value) params.append('status', selectedStatus.value)
  if (selectedYear.value) params.append('tahun', selectedYear.value.toString())
  if (selectedUnitId.value) params.append('unitId', selectedUnitId.value)
  
  window.location.href = `/api/risk-registers/export?${params.toString()}`
}

watch([selectedYear, selectedStatus, selectedUnitId], () => {
  fetchReport()
})

onMounted(async () => {
  await fetchUnits()
  await fetchReport()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 print:bg-white text-gray-900">
    <!-- Print Controls (hidden when printing) -->
    <div class="print:hidden bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <NuxtLink to="/dashboard/mutu/report/risk-register" class="btn btn-ghost btn-sm gap-2 focus:outline-none">
              <ArrowLeft class="w-4 h-4" />
              Kembali
            </NuxtLink>
            <h1 class="text-lg font-semibold">Cetak Laporan Risk Register</h1>
          </div>
          
          <div class="flex flex-wrap items-center gap-3">
            <!-- Year Selector -->
            <select v-model="selectedYear" class="select select-bordered select-sm w-32 focus:outline-none">
              <option v-for="year in years" :key="year" :value="year">Tahun {{ year }}</option>
            </select>
            
            <!-- Status Selector -->
            <select v-model="selectedStatus" class="select select-bordered select-sm w-36 focus:outline-none">
              <option value="">Semua Status</option>
              <option value="proposed">Diajukan</option>
              <option value="approved">Disetujui (Aktif)</option>
              <option value="rejected">Ditolak</option>
            </select>
            
            <!-- Unit Selector (Reviewers only) -->
            <select v-if="isReviewer" v-model="selectedUnitId" class="select select-bordered select-sm w-48 focus:outline-none">
              <option value="">Semua Unit</option>
              <option v-for="unit in unitsList" :key="unit.id" :value="unit.id">{{ unit.name }}</option>
            </select>
            
            <!-- Excel Button -->
            <button @click="exportExcel" class="btn btn-success btn-sm gap-2 text-white" :disabled="risks.length === 0">
              <Download class="w-4 h-4" />
              Excel
            </button>

            <!-- Print Button -->
            <button @click="printReport" class="btn btn-primary btn-sm gap-2" :disabled="risks.length === 0">
              <Printer class="w-4 h-4" />
              Cetak PDF
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
      <div v-else-if="risks.length === 0" class="flex flex-col items-center justify-center h-96 text-center print:hidden">
        <Calendar class="w-16 h-16 text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Tidak ada data risk register untuk kriteria ini</p>
      </div>
      
      <!-- Report -->
      <div v-else class="bg-white shadow-lg print:shadow-none p-6 print:p-4 rounded-xl border print:border-none border-gray-200">
        <!-- Report Header / Title -->
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold text-gray-900 tracking-wide uppercase">
            LAPORAN RISK REGISTER RUMAH SAKIT
          </h1>
          <p class="text-sm text-gray-600 mt-1 font-semibold">
            Tahun Pelayanan: {{ selectedYear }}
          </p>
          <p class="text-xs text-gray-500 mt-0.5">
            Unit: {{ selectedUnitName }} | Status: {{ getStatusDescription }}
          </p>
        </div>
        
        <!-- Report Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse border border-gray-400">
            <thead>
              <tr class="bg-gray-100 text-center font-bold">
                <th class="border border-gray-400 px-2 py-2 w-10">NO</th>
                <th class="border border-gray-400 px-2 py-2 w-28">UNIT/PIC</th>
                <th class="border border-gray-400 px-2 py-2 w-28">KATEGORI RISIKO</th>
                <th class="border border-gray-400 px-2 py-2">URAIAN KEJADIAN RISIKO</th>
                <th class="border border-gray-400 px-2 py-2">PENYEBAB (AKAR MASALAH)</th>
                <th class="border border-gray-400 px-2 py-2">DAMPAK RISIKO</th>
                <th class="border border-gray-400 px-2 py-2 w-10">L</th>
                <th class="border border-gray-400 px-2 py-2 w-10">S</th>
                <th class="border border-gray-400 px-2 py-2 w-12">Rating</th>
                <th class="border border-gray-400 px-2 py-2 w-20">LEVEL</th>
                <th class="border border-gray-400 px-2 py-2">UPAYA MITIGASI</th>
                <th class="border border-gray-400 px-2 py-2 w-16">STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(risk, index) in risks" :key="risk.id" class="align-top hover:bg-gray-50/50">
                <td class="border border-gray-400 px-2 py-1 text-center font-semibold">{{ index + 1 }}</td>
                <td class="border border-gray-400 px-2 py-1 font-bold">{{ risk.unitName }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ risk.kategoriRisiko }}</td>
                <td class="border border-gray-400 px-2 py-1 whitespace-pre-wrap">{{ risk.risiko }}</td>
                <td class="border border-gray-400 px-2 py-1 whitespace-pre-wrap text-gray-700">{{ risk.penyebab }}</td>
                <td class="border border-gray-400 px-2 py-1 whitespace-pre-wrap text-gray-700">{{ risk.dampak }}</td>
                <td class="border border-gray-400 px-2 py-1 text-center font-semibold">{{ risk.likelihood }}</td>
                <td class="border border-gray-400 px-2 py-1 text-center font-semibold">{{ risk.severity }}</td>
                <td class="border border-gray-400 px-2 py-1 text-center font-extrabold text-blue-700">{{ risk.riskRating }}</td>
                <td class="border border-gray-400 px-2 py-1 text-center font-bold" :class="risk.levelRisiko === 'Tinggi' ? 'text-red-600' : risk.levelRisiko === 'Sedang' ? 'text-amber-600' : 'text-green-600'">
                  {{ risk.levelRisiko }}
                </td>
                <td class="border border-gray-400 px-2 py-1 whitespace-pre-wrap font-medium text-green-700">{{ risk.mitigasi }}</td>
                <td class="border border-gray-400 px-2 py-1 text-center font-bold">
                  {{ getStatusLabel(risk.status) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="mt-8 text-right text-xs text-gray-500">
          <p>Laporan dicetak pada: {{ new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</p>
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
    font-size: 7.5px !important;
    width: 100% !important;
  }
  
  th, td {
    padding: 2px 3px !important;
  }
}
</style>
