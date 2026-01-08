<script setup lang="ts">
import { Calendar, Printer, Search, Download } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')

// Date range state
const today = new Date()
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const startDate = ref(new Date(firstDay.getTime() - (firstDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0])
const endDate = ref(new Date(lastDay.getTime() - (lastDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0])

// Unit selection state
const selectedUnitId = ref(user.value?.unitId || '')
const unitNameSelect = ref('')
const units = ref<any[]>([])
const loadingUnits = ref(false)
const unitSearchQuery = ref('')
const unitTotalPages = ref(1)
const unitCurrentPage = ref(1)
const unitInput = ref<HTMLInputElement | null>(null)

// Report data state
const reportData = ref<any>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

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
        }
      } else {
        units.value = response.data
        unitTotalPages.value = response.meta.totalPages
        unitCurrentPage.value = response.meta.page

        // Auto-select first unit if none selected (for admin)
        if (!selectedUnitId.value && units.value.length > 0 && !search) {
          selectedUnitId.value = units.value[0].id
          unitNameSelect.value = units.value[0].name
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to fetch units:', err)
  } finally {
    loadingUnits.value = false
  }
}

// Fetch report data
async function fetchData() {
  if (!selectedUnitId.value) return
  
  loading.value = true
  errorMsg.value = null
  try {
    const response = await $fetch<{ success: boolean; data: any; message?: string }>(`/api/reports/unit-daily`, {
      query: { 
        unitId: selectedUnitId.value,
        startDate: startDate.value,
        endDate: endDate.value
      }
    })
    if (response.success) {
      reportData.value = response.data
    } else {
      errorMsg.value = response.message || 'Gagal mengambil data'
    }
  } catch (error: any) {
    console.error('Failed to fetch report:', error)
    errorMsg.value = error.data?.message || 'Terjadi kesalahan sistem'
  } finally {
    loading.value = false
  }
}

// Handle unit search
let unitSearchTimeout: ReturnType<typeof setTimeout> | null = null
const handleUnitSearch = () => {
  if (unitSearchTimeout) clearTimeout(unitSearchTimeout)
  unitSearchTimeout = setTimeout(() => {
    fetchUnits(unitSearchQuery.value)
  }, 500)
}

// Watch for changes
watch([startDate, endDate, selectedUnitId], () => {
  fetchData()
})

// Navigation to print page
function goToPrintPage() {
  navigateTo({
    path: '/dashboard/mutu/report/cetak-harian',
    query: { 
      unitId: selectedUnitId.value,
      startDate: startDate.value,
      endDate: endDate.value
    }
  })
}

// Formatting helpers
function formatStandar(item: any) {
  if (item.standar === null) return '-'
  const keterangan = item.standarKeterangan || '>='
  const unit = item.standarUnit === 'percentage' ? '%' : (item.standarUnit || '')
  return `${keterangan} ${item.standar} ${unit}`
}

function formatCapaian(item: any) {
  if (item.capaian === null) return '-'
  const unit = item.standarUnit === 'percentage' ? '%' : ''
  return `${item.capaian.toFixed(2)}${unit}`
}

// Summary calculations
const totalIndicators = computed(() => reportData.value?.items?.length || 0)
const totalAchieved = computed(() => reportData.value?.items?.filter((i: any) => (i.skor || 0) >= 100).length || 0)
const overallPercentage = computed(() => {
  if (totalIndicators.value === 0) return 0
  const sumSkor = reportData.value?.items?.reduce((sum: number, i: any) => sum + (i.skor || 0), 0) || 0
  return Math.round((sumSkor / totalIndicators.value) * 10) / 10
})

// Watch for user to initialize selectedUnitId
watch(user, (newUser) => {
  if (newUser?.unitId && !selectedUnitId.value) {
    selectedUnitId.value = newUser.unitId
    fetchUnits('', 1, newUser.unitId)
  }
}, { immediate: true })

onMounted(async () => {
  // Always fetch units on mount to populate the list and handle auto-selection
  await fetchUnits('', 1, selectedUnitId.value)
  
  if (selectedUnitId.value) {
    fetchData()
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Mutu Harian</h1>
        <p class="text-base-content/60 mt-1">Rekap capaian mutu per unit dalam periode tertentu.</p>
      </div>
      
      <div class="flex flex-wrap items-center gap-2">
        <!-- Unit Selector (Admin only) -->
        <div v-if="isAdmin" class="dropdown dropdown-end">
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
          
          <ul class="dropdown-content z-[20] menu p-2 shadow bg-base-100 rounded-box w-64 max-h-60 overflow-y-auto mt-1 border border-base-content/10">
            <li v-if="units.length === 0 && !loadingUnits">
              <a class="text-base-content/50">Unit tidak ditemukan</a>
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
                <div class="flex flex-col items-start text-left">
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
                <span class="text-[10px]">Halaman {{ unitCurrentPage }} / {{ unitTotalPages }}</span>
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
        <div v-else class="px-3 py-1 bg-base-200 rounded-lg">
          <span class="text-sm font-semibold">{{ unitNameSelect || 'Unit Anda' }}</span>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="startDate"
            type="date"
            class="input input-bordered input-sm w-36"
          />
          <span class="text-sm">s/d</span>
          <input
            v-model="endDate"
            type="date"
            class="input input-bordered input-sm w-36"
          />
        </div>
        
        <button @click="goToPrintPage()" class="btn btn-primary btn-sm gap-2" :disabled="!reportData">
          <Printer class="w-4 h-4" />
          Cetak
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMsg" class="alert alert-error shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- Summary Cards -->
    <div v-if="reportData" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 text-center">
          <p class="text-sm text-base-content/60">Total Indikator</p>
          <p class="text-2xl font-bold">{{ totalIndicators }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 text-center">
          <p class="text-sm text-base-content/60">Tercapai (100%)</p>
          <p class="text-2xl font-bold text-success">{{ totalAchieved }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 text-center">
          <p class="text-sm text-base-content/60">Rata-rata Skor</p>
          <p class="text-2xl font-bold text-primary">{{ overallPercentage }}%</p>
        </div>
      </div>
    </div>

    <!-- Tabulasi / Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr class="bg-base-200">
              <th class="w-16">Kode</th>
              <th>Indikator</th>
              <th class="text-center">Numerator (N)</th>
              <th class="text-center">Denominator (D)</th>
              <th class="text-center">Hasil</th>
              <th class="text-center">Capaian</th>
              <th class="text-center">Standar</th>
              <th class="text-center">Skor</th>
              <th class="text-center">Point</th>
              <th class="text-center">PDCA</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" class="text-center">
              <td colspan="10" class="py-10">
                <span class="loading loading-spinner loading-lg"></span>
              </td>
            </tr>
            <tr v-else-if="!reportData || reportData.items.length === 0" class="text-center">
              <td colspan="10" class="py-10 text-base-content/50">
                Tidak ada data untuk periode dan unit terpilih
              </td>
            </tr>
            <tr v-for="item in reportData?.items" :key="item.indicatorId">
              <td class="font-mono text-xs">{{ item.code }}</td>
              <td class="max-w-xs whitespace-normal">
                <div class="font-medium text-sm">{{ item.judul }}</div>
              </td>
              <td class="text-center font-semibold text-primary">{{ item.numeratorValue }}</td>
              <td class="text-center font-semibold text-secondary">{{ item.denominatorValue }}</td>
              <td class="text-center font-medium">{{ item.hasil?.toFixed(2) || '-' }}</td>
              <td class="text-center font-medium">{{ formatCapaian(item) }}</td>
              <td class="text-center text-xs">{{ formatStandar(item) }}</td>
              <td class="text-center">
                <div 
                  class="badge badge-sm font-bold"
                  :class="item.skor >= 100 ? 'badge-success text-white' : 'badge-warning'"
                >
                  {{ item.skor?.toFixed(0) }}
                </div>
              </td>
              <td class="text-center font-bold text-primary">{{ item.point?.toFixed(2) }}</td>
              <td class="text-center">
                <span v-if="item.isNeedPDCA" class="tooltip" data-tip="Butuh PDCA">
                  <div class="badge badge-error badge-sm">Ya</div>
                </span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

