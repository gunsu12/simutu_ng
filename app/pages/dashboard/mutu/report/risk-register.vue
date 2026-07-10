<script setup lang="ts">
import { Calendar, Filter, Printer, Download } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface Unit {
  id: string
  name: string
  unitCode: string
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

const { user } = useAuth()
const currentYear = new Date().getFullYear()

// States
const loading = ref(false)
const selectedYear = ref(currentYear)
const selectedStatus = ref('approved') // Default only show approved for official reports
const selectedUnitId = ref('')

const isReviewer = computed(() => user.value?.role === 'admin' || user.value?.role === 'auditor')

// Years list (current - 5 to current + 1)
const years = computed(() => {
  const list = []
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    list.push(y)
  }
  return list
})

// Fetch units
const { data: unitsData } = useLazyFetch<{
  success: boolean
  data: Unit[]
}>('/api/units', {
  default: () => ({ success: false, data: [] })
})
const unitsList = computed(() => unitsData.value?.data || [])

// Fetch data
const risks = ref<RiskRegister[]>([])

async function fetchReport() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: '1',
      limit: '1000', // Fetch all matching rows for report view
      tahun: selectedYear.value.toString(),
      status: selectedStatus.value,
    })

    if (selectedUnitId.value) {
      params.append('unitId', selectedUnitId.value)
    }

    const response = await $fetch<{
      success: boolean
      data: RiskRegister[]
    }>(`/api/risk-registers?${params.toString()}`)

    if (response.success) {
      risks.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch report data:', error)
  } finally {
    loading.value = false
  }
}

// Navigate to print page
function goToPrint() {
  const query: any = {
    year: selectedYear.value,
    status: selectedStatus.value,
  }
  if (selectedUnitId.value) {
    query.unitId = selectedUnitId.value
  }
  navigateTo({
    path: '/dashboard/mutu/report/cetak-risk-register',
    query
  })
}

// Watch filters
watch([selectedYear, selectedStatus, selectedUnitId], () => {
  fetchReport()
})

onMounted(() => {
  fetchReport()
})

const getLevelClass = (level: string) => {
  switch (level) {
    case 'Tinggi': return 'text-error font-bold'
    case 'Sedang': return 'text-warning font-bold'
    default: return 'text-success'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    default: return 'Diajukan'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Risk Register</h1>
        <p class="text-base-content/60 mt-1">Rekapitulasi dan laporan analisis risiko unit pelayanan rumah sakit.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <!-- Year Filter -->
        <select v-model="selectedYear" class="select select-bordered select-sm w-32 focus:outline-none">
          <option v-for="year in years" :key="year" :value="year">Tahun {{ year }}</option>
        </select>

        <!-- Status Filter -->
        <select v-model="selectedStatus" class="select select-bordered select-sm w-36 focus:outline-none">
          <option value="">Semua Status</option>
          <option value="proposed">Diajukan</option>
          <option value="approved">Disetujui (Aktif)</option>
          <option value="rejected">Ditolak</option>
        </select>
        
        <!-- Unit Filter -->
        <select v-if="isReviewer" v-model="selectedUnitId" class="select select-bordered select-sm w-48 focus:outline-none">
          <option value="">Semua Unit</option>
          <option v-for="unit in unitsList" :key="unit.id" :value="unit.id">{{ unit.name }}</option>
        </select>
        
        <!-- Print Button -->
        <button @click="goToPrint" class="btn btn-primary btn-sm gap-2" :disabled="risks.length === 0">
          <Printer class="w-4 h-4" />
          Cetak PDF
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Report Table -->
    <div v-else-if="risks.length > 0" class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-sm table-zebra w-full text-xs">
          <thead class="bg-base-200">
            <tr>
              <th class="text-center w-12">NO</th>
              <th class="w-20 text-center">Tahun</th>
              <th>Unit Pelayanan</th>
              <th>Kategori Risiko</th>
              <th>Uraian Risiko</th>
              <th>Akar Masalah / Penyebab</th>
              <th>Dampak</th>
              <th class="text-center w-12">L</th>
              <th class="text-center w-12">S</th>
              <th class="text-center w-16">Rating</th>
              <th class="text-center w-20">Level</th>
              <th>Mitigasi</th>
              <th class="text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(risk, index) in risks" :key="risk.id" class="align-top">
              <td class="text-center font-semibold">{{ index + 1 }}</td>
              <td class="text-center">{{ risk.tahun }}</td>
              <td class="font-semibold">{{ risk.unitName }}</td>
              <td class="font-medium">{{ risk.kategoriRisiko }}</td>
              <td class="whitespace-pre-wrap max-w-xs">{{ risk.risiko }}</td>
              <td class="whitespace-pre-wrap max-w-xs text-base-content/70">{{ risk.penyebab }}</td>
              <td class="whitespace-pre-wrap max-w-xs text-base-content/70">{{ risk.dampak }}</td>
              <td class="text-center font-bold">{{ risk.likelihood }}</td>
              <td class="text-center font-bold">{{ risk.severity }}</td>
              <td class="text-center font-extrabold text-primary">{{ risk.riskRating }}</td>
              <td class="text-center">
                <span :class="getLevelClass(risk.levelRisiko)">
                  {{ risk.levelRisiko }}
                </span>
              </td>
              <td class="whitespace-pre-wrap max-w-xs font-medium text-success">{{ risk.mitigasi }}</td>
              <td class="text-center font-semibold">
                {{ getStatusLabel(risk.status) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center h-64 text-center">
      <Calendar class="w-16 h-16 text-gray-400 mb-4" />
      <p class="text-gray-500 text-lg">Tidak ada data risk register untuk kriteria pencarian ini</p>
    </div>
  </div>
</template>
