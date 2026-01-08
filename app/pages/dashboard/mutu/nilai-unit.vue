<script setup lang="ts">
import { Plus, Search, Edit, Trash2, Calendar, Eye, Book, FileText } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Types
interface IndicatorEntry {
  id: string
  entryCode: string
  unitId: string
  entryDate: Date
  entryFrequency: '' | 'daily' | 'monthly'
  notes?: string | null
  status: 'proposed' | 'checked' | 'pending' | 'finish'
  createdBy: string
  updatedBy?: string | null
  auditorNotes?: string | null
  unit?: {
    id: string
    name: string
    unitCode: string
  }
  items?: IndicatorEntryItem[]
}

interface IndicatorEntryItem {
  id: string
  indicatorId: string
  numeratorValue?: number | null
  denominatorValue?: number | null
  skor?: number | null
  numeratorDenominatorResult?: number | null
  isAlreadyChecked: boolean
  isNeedPDCA: boolean
  notes?: string | null
  indicator?: {
    id: string
    code: string
    judul: string
    numerator?: string | null
    denominator?: string | null
    target?: number | null
    targetUnit?: string | null
    targetKeterangan?: string | null
    targetCalculationFormula?: string | null
    targetWeight?: number | null
  }
}

interface Indicator {
  id: string
  code: string
  judul: string
  numerator?: string | null
  denominator?: string | null
  entryFrequency: '' | 'daily' | 'monthly'
  targetCalculationFormula?: string | null
  targetWeight?: number | null
}

// Notification state
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) {
  const id = Math.random().toString(36).substr(2, 9)
  notifications.value.push({ id, type, message, duration })
  
  if (duration > 0) {
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, duration)
  }
}

function closeNotification(id: string) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

// State
const searchQuery = ref('')
const entries = ref<IndicatorEntry[]>([])
const units = ref<{ id: string, name: string }[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedEntry = ref<IndicatorEntry | null>(null)

// Filter state
const today = new Date()
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const filterStartDate = ref(new Date(firstDay.getTime() - (firstDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0])
const filterEndDate = ref(new Date(lastDay.getTime() - (lastDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0])
const filterFrequency = ref<'daily' | 'monthly' | ''>('')
const filterStatus = ref<string>('')
const filterUnitId = ref('')
const unitSearchQuery = ref('')
const unitLoading = ref(false)
const unitTotalPages = ref(1)
const unitCurrentPage = ref(1)
const unitInput = ref<HTMLInputElement | null>(null)
const unitNameSelect = ref('')

// Indicator detail modal state
const selectedIndicatorId = ref('')
const showDetailModal = ref(false)

// Calculated indicators modal state
const showCalculatedModal = ref(false)
const selectedCalculatedEntry = ref<IndicatorEntry | null>(null)

// Form data
const formData = ref({
  entryDate: new Date().toISOString().split('T')[0],
  entryFrequency: '' as '' | 'daily' | 'monthly',
  notes: '',
  items: [] as {
    indicatorId: string
    indicatorCode: string
    indicatorName: string
    numeratorValue: number | null
    denominatorValue: number | null
    skor: number | null
    notes: string
    numeratorDesc?: string | null
    denominatorDesc?: string | null
    targetCalculationFormula?: string | null
    showDetails?: boolean
  }[]
})

const availableIndicators = ref<Indicator[]>([])
const loadingIndicators = ref(false)

// Get user info from session
const { user } = useAuth()
const unitId = computed(() => user.value?.unitId || '')
const isAdmin = computed(() => user.value?.role === 'admin')

// Auto-set filterUnitId for non-admins
watchEffect(() => {
  if (!isAdmin.value && unitId.value && !filterUnitId.value) {
    filterUnitId.value = unitId.value
  }
})

// Computed
const filteredEntries = computed(() => {
  if (!searchQuery.value) return entries.value
  return entries.value.filter(entry =>
    entry.entryCode.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    entry.unit?.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    entry.status.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Methods
async function fetchEntries() {
  loading.value = true
  try {
    // Build query parameters from filters
    const params = new URLSearchParams()
    
    if (filterStartDate.value) {
      params.append('startDate', filterStartDate.value)
    }
    if (filterEndDate.value) {
      params.append('endDate', filterEndDate.value)
    }
    if (filterFrequency.value) {
      params.append('entryFrequency', filterFrequency.value)
    }
    if (filterStatus.value) {
      params.append('status', filterStatus.value)
    }
    if (filterUnitId.value) {
      params.append('unitId', filterUnitId.value)
    }

    const queryString = params.toString()
    const url = `/api/indicator-entries${queryString ? '?' + queryString : ''}`
    
    const response = await $fetch<{ success: boolean; data: IndicatorEntry[] }>(url)
    if (response.success) {
      entries.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch entries:', error)
    const message = error.data?.message || error.message || 'Failed to fetch entries'
    showNotification(message, 'error')
  } finally {
    loading.value = false
  }
}

async function fetchUnits(search = '', page = 1, fetchById = '') {
  unitLoading.value = true
  try {
    const response = await $fetch<{ 
      success: boolean; 
      data: any[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/units', {
      query: { 
        search, 
        page, 
        limit: 10,
        id: fetchById
      }
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
        
        if (filterUnitId.value && !unitNameSelect.value) {
          const currentUnit = units.value.find(u => u.id === filterUnitId.value)
          if (currentUnit) {
            unitNameSelect.value = currentUnit.name
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to fetch units:', err)
  } finally {
    unitLoading.value = false
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

function openCreateModal() {
  modalMode.value = 'create'
  selectedEntry.value = null
  resetForm()
  modalOpen.value = true
}

function openEditModal(entry: IndicatorEntry) {
  modalMode.value = 'edit'
  selectedEntry.value = entry
  formData.value = {
    entryDate: new Date(entry.entryDate).toISOString().split('T')[0],
    entryFrequency: entry.entryFrequency,
    notes: entry.notes || '',
    items: entry.items?.map(item => ({
      indicatorId: item.indicatorId,
      indicatorCode: item.indicator?.code || '',
      indicatorName: item.indicator?.judul || '',
      numeratorValue: item.numeratorValue ? Number(item.numeratorValue) : null,
      denominatorValue: item.denominatorValue ? Number(item.denominatorValue) : null,
      skor: item.skor ? Number(item.skor) : null,
      notes: item.notes || '',
      numeratorDesc: item.indicator?.numerator || null,
      denominatorDesc: item.indicator?.denominator || null,
      targetCalculationFormula: item.indicator?.targetCalculationFormula || null,
      showDetails: true
    })) || []
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  selectedEntry.value = null
  resetForm()
}

function resetForm() {
  formData.value = {
    entryDate: new Date().toISOString().split('T')[0],
    entryFrequency: '',
    notes: '',
    items: []
  }
  availableIndicators.value = []
}

function toggleIndicatorDetails(index: number) {
  const item = formData.value.items[index]
  if (!item) return
  item.showDetails = !item.showDetails
}

function resetFilters() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  filterStartDate.value = new Date(firstDay.getTime() - (firstDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
  filterEndDate.value = new Date(lastDay.getTime() - (lastDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
  filterFrequency.value = ''
  filterStatus.value = ''
  if (isAdmin.value) {
    filterUnitId.value = ''
    unitNameSelect.value = ''
  } else {
    filterUnitId.value = unitId.value
  }
  fetchEntries()
}

function openDetailModal(indicatorId: string) {
  selectedIndicatorId.value = indicatorId
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedIndicatorId.value = ''
}

function openCalculatedModal(entry: IndicatorEntry) {
  selectedCalculatedEntry.value = entry
  showCalculatedModal.value = true
}

function closeCalculatedModal() {
  showCalculatedModal.value = false
  selectedCalculatedEntry.value = null
}

// Helper function to calculate result based on targetCalculationFormula
function calculateResult(
  numerator: number | null | undefined, 
  denominator: number | null | undefined, 
  formula: string | null | undefined
): number | null {
  const n = Number(numerator) || 0
  const d = Number(denominator) || 0
  
  // Handle special case: if both are 0, result is 0
  if (n === 0 && d === 0) {
    return 0
  }
  
  // Prevent division by zero
  if (d === 0 && (formula === 'N/D' || formula === '(N/D)*100' || !formula)) {
    return null
  }
  
  switch (formula) {
    case 'N/D':
      return n / d
    case 'N-D':
      return n - d
    case '(N/D)*100':
      return (n / d) * 100
    case 'D-N':
      return d - n
    case 'N+D':
      return n + d
    case 'N':
      return n
    case 'D':
      return d
    default:
      // Default to N/D if no formula specified
      return d !== 0 ? n / d : null
  }
}

// Watch entry frequency to fetch indicators
watch(() => formData.value.entryFrequency, (newFrequency) => {
  if (modalOpen.value && modalMode.value === 'create' && newFrequency) {
    fetchAvailableIndicators(newFrequency as 'daily' | 'monthly')
  }
})

async function saveEntry() {
  loading.value = true
  try {
    const payload = {
      unitId: unitId.value,
      entryDate: formData.value.entryDate,
      entryFrequency: formData.value.entryFrequency,
      notes: formData.value.notes,
      items: formData.value.items.map(item => ({
        indicatorId: item.indicatorId,
        numeratorValue: item.numeratorValue,
        denominatorValue: item.denominatorValue,
        skor: item.skor,
        numeratorDenominatorResult: calculateResult(
          item.numeratorValue, 
          item.denominatorValue, 
          item.targetCalculationFormula
        ),
        notes: item.notes
      }))
    }

    if (modalMode.value === 'create') {
      const response = await $fetch('/api/indicator-entries', {
        method: 'POST',
        body: payload
      })
      if (response.success) {
        await fetchEntries()
        closeModal()
        showNotification('Entri berhasil dibuat', 'success')
      }
    } else if (selectedEntry.value) {
      const response = await $fetch(`/api/indicator-entries/${selectedEntry.value.id}`, {
        method: 'PUT' as any,
        body: payload
      })
      if (response.success) {
        await fetchEntries()
        closeModal()
        showNotification('Entri berhasil diperbarui', 'success')
      }
    }
  } catch (error: any) {
    console.error('Failed to save entry:', error)
    
    let message = 'Gagal menyimpan entri'
    if (error.data?.message) {
      message = error.data.message
    } else if (error.message) {
      message = error.message
    }
    
    if (error.status === 400) {
      showNotification(message, 'warning')
    } else if (error.status === 401) {
      showNotification('Tidak terotorisasi. Silakan login kembali.', 'error')
    } else {
      showNotification(message, 'error')
    }
  } finally {
    loading.value = false
  }
}

async function deleteEntry(id: string) {
  if (!confirm('Apakah Anda yakin ingin menghapus entri ini?')) return

  loading.value = true
  try {
    const response = await $fetch(`/api/indicator-entries/${id}`, {
      method: 'DELETE' as any
    })
    if (response.success) {
      await fetchEntries()
      showNotification('Entri berhasil dihapus', 'success')
    }
  } catch (error: any) {
    console.error('Failed to delete entry:', error)
    const message = error.data?.message || error.message || 'Gagal menghapus entri'
    showNotification(message, 'error')
  } finally {
    loading.value = false
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'proposed': return 'badge-warning'
    case 'checked': return 'badge-info'
    case 'pending': return 'badge-warning'
    case 'finish': return 'badge-success'
    default: return 'badge-ghost'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'proposed': return 'Diajukan'
    case 'checked': return 'Terverifikasi'
    case 'pending': return 'Tertunda'
    case 'finish': return 'Selesai'
    default: return status
  }
}

// Fetch entries on mount
onMounted(async () => {
  if (isAdmin.value) {
    fetchUnits()
  } else if (unitId.value) {
    filterUnitId.value = unitId.value
    // Specifically fetch the unit name for this user
    fetchUnits('', 1, unitId.value)
  }
  fetchEntries()
})

async function fetchAvailableIndicators(frequency: 'daily' | 'monthly') {
  if (!unitId.value) {
    console.error('No unit ID found for user:', user.value)
    showNotification('Tidak dapat memuat indikator: Tidak ada unit yang ditugaskan ke akun Anda', 'error')
    return
  }

  if(!frequency) {
    availableIndicators.value = []
    formData.value.items = []
    return
  }

  loadingIndicators.value = true
  try {
    const response = await $fetch<{ success: boolean; data: Indicator[] }>(
      `/api/indicator-entries/unit/${unitId.value}?entryFrequency=${frequency}`
    )
    if (response.success) {
      availableIndicators.value = response.data
      // Initialize items array with all available indicators
      formData.value.items = response.data.map(indicator => ({
        indicatorId: indicator.id,
        indicatorCode: indicator.code,
        indicatorName: indicator.judul,
        numeratorValue: null,
        denominatorValue: null,
        skor: null,
        notes: '',
        numeratorDesc: indicator.numerator || null,
        denominatorDesc: indicator.denominator || null,
        targetCalculationFormula: indicator.targetCalculationFormula || null,
        showDetails: true
      }))
      
      if (response.data.length === 0) {
        console.warn('No indicators found for unit:', unitId.value, 'frequency:', frequency)
      }
    }
  } catch (error: any) {
    console.error('Failed to fetch indicators:', error)
    const message = error.data?.message || 'Gagal memuat indikator. Silakan coba lagi.'
    showNotification(message, 'error')
  } finally {
    loadingIndicators.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Indicator Detail Modal (rendered at top for proper z-index/ordering) -->
    <IndicatorDetailModal
      :indicator-id="selectedIndicatorId"
      :is-open="showDetailModal"
      @close="closeDetailModal"
    />
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Entri Nilai Mutu Indikator</h1>
        <p class="text-base-content/60 mt-1">Kelola entri nilai mutu indikator untuk unit Anda</p>
      </div>
      <button
        @click="openCreateModal"
        class="btn btn-primary gap-2"
      >
        <Plus class="w-4 h-4" />
        Tambah Entri
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <h3 class="font-semibold text-base-content mb-3">Filter</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <!-- Start Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-sm">Tanggal Mulai</span>
            </label>
            <input
              v-model="filterStartDate"
              type="date"
              @change="fetchEntries"
              class="input input-bordered input-sm"
            />
          </div>

          <!-- End Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-sm">Tanggal Selesai</span>
            </label>
            <input
              v-model="filterEndDate"
              type="date"
              @change="fetchEntries"
              class="input input-bordered input-sm"
            />
          </div>

          <!-- Frequency -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-sm">Frekuensi</span>
            </label>
            <select
              v-model="filterFrequency"
              @change="fetchEntries"
              class="select select-bordered select-sm"
            >
              <option value="">Semua Frekuensi</option>
              <option value="daily">Harian</option>
              <option value="monthly">Bulanan</option>
            </select>
          </div>

          <!-- Status -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-sm">Status</span>
            </label>
            <select
              v-model="filterStatus"
              @change="fetchEntries"
              class="select select-bordered select-sm"
            >
              <option value="">Semua Status</option>
              <option value="proposed">Diajukan</option>
              <option value="checked">Terverifikasi</option>
              <option value="pending">Tertunda</option>
              <option value="finish">Selesai</option>
            </select>
          </div>

          <!-- Reset Button -->
          <div :class="['form-control', isAdmin ? 'lg:col-span-1' : 'flex justify-end']">
            <label class="label">
              <span class="label-text text-sm invisible">Aksi</span>
            </label>
            <button
              @click="resetFilters"
              class="btn btn-outline btn-sm"
            >
              Hapus Filter
            </button>
          </div>
          
          <!-- Unit Filter (Admin only) -->
          <div class="form-control lg:col-span-2" v-if="isAdmin">
            <label class="label">
              <span class="label-text text-sm font-medium">Filter Unit</span>
            </label>
            <div class="dropdown w-full">
              <div class="relative">
                <input
                  ref="unitInput"
                  v-model="unitNameSelect"
                  type="text"
                  placeholder="Cari Unit..."
                  class="input input-bordered input-sm w-full"
                  @input="(e) => { 
                    unitSearchQuery = (e.target as HTMLInputElement).value;
                    handleUnitSearch();
                  }"
                  @focus="() => { if (!unitSearchQuery) fetchUnits() }"
                />
                <div v-if="unitLoading" class="absolute right-8 top-1/2 -translate-y-1/2">
                  <span class="loading loading-spinner loading-xs"></span>
                </div>
              </div>
              
              <ul class="dropdown-content z-[20] menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto mt-1 border border-base-content/10">
                <li v-if="units.length === 0 && !unitLoading">
                  <a class="text-base-content/50">Unit tidak ditemukan</a>
                </li>
                <li v-for="unit in units" :key="unit.id">
                  <button 
                    type="button"
                    @click="() => { 
                      filterUnitId = unit.id; 
                      unitNameSelect = unit.name;
                      (unitInput as any)?.blur();
                      fetchEntries();
                    }"
                    :class="{ 'active': filterUnitId === unit.id }"
                  >
                    <div class="flex flex-col items-start text-left">
                      <span class="font-medium text-xs">{{ unit.name }}</span>
                      <span class="text-[10px] opacity-50">{{ (unit as any).unitCode }}</span>
                    </div>
                  </button>
                </li>
                <li v-if="unitTotalPages > 1" class="border-t border-base-content/10 mt-2 pt-2">
                  <div class="flex justify-between items-center px-4 py-2">
                    <button 
                      type="button"
                      class="btn btn-xs" 
                      :disabled="unitCurrentPage === 1 || unitLoading"
                      @click.stop="fetchUnits(unitSearchQuery, unitCurrentPage - 1)"
                    >«</button>
                    <span class="text-[10px]">Halaman {{ unitCurrentPage }} dari {{ unitTotalPages }}</span>
                    <button 
                      type="button"
                      class="btn btn-xs" 
                      :disabled="unitCurrentPage === unitTotalPages || unitLoading"
                      @click.stop="fetchUnits(unitSearchQuery, unitCurrentPage + 1)"
                    >»</button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div v-else-if="unitId" class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text text-sm font-medium">Unit Anda</span>
            </label>
            <div class="p-2 bg-base-200 rounded text-sm font-semibold truncate">
              {{ unitNameSelect || 'Loading...' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead class="bg-base-200/50">
              <tr>
                <th>Kode Entri</th>
                <th>Tanggal Entri</th>
                <th>Frekuensi</th>
                <th>Status</th>
                <th>Item</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center">Loading...</td>
              </tr>
              <tr v-else-if="filteredEntries.length === 0">
                <td colspan="6" class="p-12">
                  <div class="flex flex-col items-center justify-center text-center">
                    <FileText class="w-16 h-16 text-base-content/20 mb-4" />
                    <p class="text-base-content/60">
                      {{ (searchQuery || filterFrequency || filterStatus || (isAdmin && filterUnitId)) ? 'Entri tidak ditemukan' : 'Belum ada entri' }}
                    </p>
                    <button v-if="!(searchQuery || filterFrequency || filterStatus || (isAdmin && filterUnitId))" @click="openCreateModal" class="btn btn-primary btn-sm mt-4">
                      <Plus class="w-4 h-4" />
                      Buat Entri Pertama
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-else v-for="entry in filteredEntries" :key="entry.id">
                <td class="font-medium">{{ entry.entryCode }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <Calendar class="w-4 h-4" />
                    {{ new Date(entry.entryDate).toLocaleDateString() }}
                  </div>
                </td>
                <td>
                  <span class="badge badge-primary badge-sm">
                    {{ entry.entryFrequency === 'daily' ? 'Harian' : 'Bulanan' }}
                  </span>
                </td>
                <td>
                  <span :class="['badge badge-sm', getStatusBadge(entry.status)]">
                    {{ getStatusLabel(entry.status) }}
                  </span>
                </td>
                <td>
                  <button
                    @click.stop="openCalculatedModal(entry)"
                    class="btn btn-sm btn-outline"
                    type="button"
                  >
                    {{ entry.items?.length || 0 }} indikator
                  </button>
                </td>
                <td class="text-right">
                  <div class="flex gap-2 justify-end">
                    <button
                      @click="openEditModal(entry)"
                      class="btn btn-ghost btn-sm"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click="deleteEntry(entry.id)"
                      class="btn btn-ghost btn-sm text-error"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <!-- Modal -->
      <dialog :open="modalOpen" class="modal modal-open" v-if="modalOpen">
        <div class="modal-box max-w-4xl">
          <h2 class="text-xl font-bold mb-4">
            {{ modalMode === 'create' ? 'Tambah Entri Baru' : 'Ubah Entri' }}
          </h2>

          <form @submit.prevent="saveEntry" class="space-y-4">
            <!-- Entry Date -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tanggal Entri *</span>
              </label>
              <input
                v-model="formData.entryDate"
                type="date"
                required
                class="input input-bordered"
              />
            </div>

            <!-- Entry Frequency -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Frekuensi Entri *</span>
              </label>
              <select
                v-model="formData.entryFrequency"
                required
                :disabled="modalMode === 'edit'"
                class="select select-bordered"
              >
                <option value="">- Pilih -</option>
                <option value="daily">Harian</option>
                <option value="monthly">Bulanan</option>
              </select>
            </div>

            <!-- Notes -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Catatan</span>
              </label>
              <textarea
                v-model="formData.notes"
                rows="3"
                class="textarea textarea-bordered"
              ></textarea>
            </div>

            <!-- Indicators -->
            <div v-if="loadingIndicators" class="text-center py-4">
              <span class="loading loading-spinner loading-md"></span>
              <p class="text-base-content/60 mt-2">Memuat indikator...</p>
            </div>
            <div v-else-if="formData.items.length > 0">
              <h3 class="text-lg font-semibold mb-3">Indikator</h3>
              <div class="space-y-4">
                <div
                  v-for="(item, index) in formData.items"
                  :key="item.indicatorId"
                  class="card bg-base-200 border border-base-300"
                >
                  <div class="card-body p-4">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <h4 class="font-medium mb-2">
                          {{ item.indicatorCode }} - {{ item.indicatorName }}
                        </h4>
                        <details class="cursor-pointer" open @toggle="item.showDetails = !item.showDetails">
                          <summary class="text-sm text-base-content/80 hover:text-base-content flex items-center">
                            <Book class="w-4 h-4 mr-2" /> Lihat detail indikator
                          </summary>
                          <div class="mt-3 space-y-2 text-sm">
                            <div v-if="item.numeratorDesc" class="divider my-2">Numerator</div>
                            <div v-if="item.numeratorDesc" class="bg-base-300 p-2 rounded text-md">
                              {{ item.numeratorDesc }}
                            </div>
                            <div v-if="item.denominatorDesc" class="divider my-2">Denominator</div>
                            <div v-if="item.denominatorDesc" class="bg-base-300 p-2 rounded text-md">
                              {{ item.denominatorDesc }}
                            </div>
                          </div>
                        </details>
                      </div>
                      <button
                        type="button"
                        @click="openDetailModal(item.indicatorId)"
                        class="btn btn-ghost btn-sm btn-square"
                        title="Lihat detail lengkap"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                    </div>
                    <div class="divider my-2"></div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text text-xs">Numerator</span>
                        </label>
                        <input
                          v-model.number="item.numeratorValue"
                          type="number"
                          step="any"
                          placeholder="Nilai Numerator"
                          class="input input-bordered input-sm"
                        />
                      </div>
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text text-xs">Denominator</span>
                        </label>
                        <input
                          v-model.number="item.denominatorValue"
                          type="number"
                          step="any"
                          placeholder="Nilai Denominator"
                          class="input input-bordered input-sm"
                        />
                      </div>
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text text-xs">Skor</span>
                        </label>
                        <input
                          v-model.number="item.skor"
                          type="number"
                          step="any"
                          placeholder="Nilai Skor"
                          class="input input-bordered input-sm"
                        />
                      </div>
                    </div>
                    <div class="form-control mt-3">
                      <label class="label">
                        <span class="label-text text-xs">Catatan</span>
                      </label>
                      <input
                        v-model="item.notes"
                        type="text"
                        placeholder="Tambah catatan (opsional)"
                        class="input input-bordered input-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="modalOpen && formData.entryFrequency" class="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 class="font-bold">Indikator tidak ditemukan!</h3>
                <div class="text-sm">
                  Tidak ada indikator {{ formData.entryFrequency === 'daily' ? 'harian' : 'bulanan' }} yang ditugaskan ke unit Anda.
                  Silakan hubungi administrator untuk menugaskan indikator ke unit Anda di halaman 
                  <strong>Mutu → Master → Indikator</strong>.
                </div>
              </div>
            </div>
            <div v-else class="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Pilih frekuensi entri untuk memuat indikator</span>
            </div>

            <!-- Actions -->
            <div class="modal-action">
              <button
                type="button"
                @click="closeModal"
                class="btn btn-ghost"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="loading || formData.items.length === 0"
                class="btn btn-primary"
              >
                <span v-if="loading" class="loading loading-spinner"></span>
                {{ loading ? 'Menyimpan...' : modalMode === 'create' ? 'Simpan Entri' : 'Perbarui Entri' }}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop" @click="closeModal">
          <button>tutup</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Calculated Indicators Modal Component -->
    <CalculatedIndicatorsModal
      :is-open="showCalculatedModal"
      :selected-entry="selectedCalculatedEntry"
      @close="closeCalculatedModal"
      @viewDetail="openDetailModal"
    />

    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-[10000] space-y-2 pointer-events-none">
      <transition-group name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'alert shadow-lg pointer-events-auto',
            notification.type === 'success' && 'alert-success',
            notification.type === 'error' && 'alert-error',
            notification.type === 'warning' && 'alert-warning',
            notification.type === 'info' && 'alert-info'
          ]"
        >
          <div class="flex items-center justify-between gap-2 max-w-sm">
            <span class="text-sm">{{ notification.message }}</span>
            <button
              @click="closeNotification(notification.id)"
              class="btn btn-ghost btn-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>