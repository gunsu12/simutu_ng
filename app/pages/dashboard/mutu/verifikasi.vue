<script setup lang="ts">
import { Search, Calendar, Eye, CheckCircle, Clock, AlertTriangle, Filter, History, MessageSquare, ArrowRight, User, Info, Check } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Types
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
    divisionId: string
  }
  division?: {
    id: string
    name: string
    code: string
  }
  createdByUser?: {
    id: string
    name: string
  }
  items?: IndicatorEntryItem[]
}

interface Division {
  id: string
  name: string
  code: string
}

interface Unit {
  id: string
  name: string
  unitCode: string
  divisionId: string
}

// Notification state
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const notifications = ref<Notification[]>([])

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) {
  const id = Math.random().toString(36).substr(2, 9)
  notifications.value.push({ id, type, message })
  
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
const loading = ref(false)
const divisions = ref<Division[]>([])
const units = ref<Unit[]>([])

// Filter state
const now = new Date()
const lastWeek = new Date(now)
lastWeek.setDate(now.getDate() - 6)

const filterStartDate = ref(lastWeek.toISOString().split('T')[0])
const filterEndDate = ref(now.toISOString().split('T')[0])
const filterFrequency = ref<'daily' | 'monthly' | ''>('')
const filterStatus = ref<string>('')
const filterDivisionId = ref<string>('')
const filterUnitId = ref<string>('')

// Modal state
const showStatusModal = ref(false)
const selectedEntry = ref<IndicatorEntry | null>(null)
const newStatus = ref<string>('')
const auditorNotes = ref<string>('')
const updatingStatus = ref(false)
const verificationLogs = ref<any[]>([])
const loadingLogs = ref(false)

// Calculated indicators modal state
const showCalculatedModal = ref(false)
const selectedCalculatedEntry = ref<IndicatorEntry | null>(null)

// Get user info from session
const { data: session } = await useFetch('/api/auth/session')
const user = computed(() => session.value?.data?.user)
const isManager = computed(() => user.value?.role === 'manager')
const isAuditor = computed(() => user.value?.role === 'auditor' || user.value?.role === 'admin')

// Role-based allowed statuses
const allowedStatuses = computed(() => {
  const role = user.value?.role
  if (!role) return []
  
  switch (role) {
    case 'user':
      return ['proposed']
    case 'manager':
      return ['checked', 'pending']
    case 'auditor':
      return ['finish']
    case 'admin':
      return ['proposed', 'checked', 'pending', 'finish']
    default:
      return []
  }
})

// Computed - filtered units based on division selection
const filteredUnits = computed(() => {
  if (!filterDivisionId.value) return units.value
  return units.value.filter(u => u.divisionId === filterDivisionId.value)
})

// Computed - search filter
const filteredEntries = computed(() => {
  if (!searchQuery.value) return entries.value
  const query = searchQuery.value.toLowerCase()
  return entries.value.filter(entry =>
    entry.entryCode.toLowerCase().includes(query) ||
    entry.unit?.name.toLowerCase().includes(query) ||
    entry.division?.name.toLowerCase().includes(query) ||
    entry.status.toLowerCase().includes(query)
  )
})

// Methods
async function fetchEntries() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    
    if (filterStartDate.value) params.append('startDate', filterStartDate.value)
    if (filterEndDate.value) params.append('endDate', filterEndDate.value)
    if (filterFrequency.value) params.append('entryFrequency', filterFrequency.value)
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (filterDivisionId.value) params.append('divisionId', filterDivisionId.value)
    if (filterUnitId.value) params.append('unitId', filterUnitId.value)

    const queryString = params.toString()
    const url = `/api/indicator-entries/verifikasi${queryString ? '?' + queryString : ''}`
    
    const response = await $fetch<{ success: boolean; data: IndicatorEntry[] }>(url)
    if (response.success) {
      entries.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch entries:', error)
    const message = error.data?.message || error.message || 'Gagal mengambil entri'
    showNotification(message, 'error')
  } finally {
    loading.value = false
  }
}

async function fetchDivisions() {
  try {
    const response = await $fetch<{ success: boolean; data: Division[] }>('/api/divisions')
    if (response.success) {
      divisions.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch divisions:', error)
  }
}

async function fetchUnits() {
  try {
    const response = await $fetch<{ success: boolean; data: Unit[] }>('/api/units')
    if (response.success) {
      units.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch units:', error)
  }
}

function resetFilters() {
  const now = new Date()
  const lastWeek = new Date(now)
  lastWeek.setDate(now.getDate() - 6)

  filterStartDate.value = lastWeek.toISOString().split('T')[0]
  filterEndDate.value = now.toISOString().split('T')[0]
  filterFrequency.value = ''
  filterStatus.value = ''
  filterDivisionId.value = ''
  filterUnitId.value = ''
  fetchEntries()
}

async function openStatusModal(entry: IndicatorEntry) {
  selectedEntry.value = entry
  newStatus.value = allowedStatuses.value[0] || entry.status
  auditorNotes.value = ''
  verificationLogs.value = []
  showStatusModal.value = true
  
  // Fetch verification logs
  loadingLogs.value = true
  try {
    const response = await $fetch<{ success: boolean; data: any[] }>(`/api/indicator-entries/${entry.id}/logs`)
    if (response.success) {
      verificationLogs.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch verification logs:', error)
  } finally {
    loadingLogs.value = false
  }
}

function closeStatusModal() {
  showStatusModal.value = false
  selectedEntry.value = null
  newStatus.value = ''
  auditorNotes.value = ''
  verificationLogs.value = []
}

async function updateEntryStatus() {
  if (!selectedEntry.value) return
  
  updatingStatus.value = true
  try {
    const response = await $fetch(`/api/indicator-entries/${selectedEntry.value.id}/status`, {
      method: 'PUT',
      body: {
        status: newStatus.value,
        auditorNotes: auditorNotes.value,
      },
    })
    
    if (response.success) {
      showNotification('Status berhasil diperbarui', 'success')
      closeStatusModal()
      await fetchEntries()
    }
  } catch (error: any) {
    console.error('Failed to update status:', error)
    showNotification(error.data?.message || 'Gagal memperbarui status', 'error')
  } finally {
    updatingStatus.value = false
  }
}

function openCalculatedModal(entry: IndicatorEntry) {
  selectedCalculatedEntry.value = entry
  showCalculatedModal.value = true
}

function closeCalculatedModal() {
  showCalculatedModal.value = false
  selectedCalculatedEntry.value = null
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

function getStatusIcon(status: string) {
  switch (status) {
    case 'proposed': return AlertTriangle
    case 'checked': return Eye
    case 'pending': return Clock
    case 'finish': return CheckCircle
    default: return Clock
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

function formatDate(dateStr: string | Date) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Watch for division changes to reset unit filter
watch(filterDivisionId, () => {
  filterUnitId.value = ''
})

// Fetch data on mount
onMounted(() => {
  fetchEntries()
  if (!isManager.value) {
    fetchDivisions()
  }
  fetchUnits()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Verifikasi Nilai Mutu</h1>
        <p class="text-base-content/60 mt-1">
          <span v-if="isManager">Verifikasi entri indikator untuk divisi Anda</span>
          <span v-else>Verifikasi dan validasi seluruh entri indikator mutu</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="isManager" class="badge badge-info badge-lg gap-2">
          <Eye class="w-4 h-4" />
          Tampilan Manajer
        </span>
        <span v-else class="badge badge-primary badge-lg gap-2">
          <CheckCircle class="w-4 h-4" />
          Tampilan Auditor
        </span>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <div class="flex items-center gap-2 mb-3">
          <Filter class="w-4 h-4" />
          <h3 class="font-semibold text-base-content">Filter</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
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
              <span class="label-text text-sm">Tanggal Akhir</span>
            </label>
            <input
              v-model="filterEndDate"
              type="date"
              @change="fetchEntries"
              class="input input-bordered input-sm"
            />
          </div>

          <!-- Division (only for auditor) -->
          <div v-if="!isManager" class="form-control">
            <label class="label">
              <span class="label-text text-sm">Divisi</span>
            </label>
            <select
              v-model="filterDivisionId"
              @change="fetchEntries"
              class="select select-bordered select-sm"
            >
              <option value="">Semua Divisi</option>
              <option v-for="div in divisions" :key="div.id" :value="div.id">
                {{ div.name }}
              </option>
            </select>
          </div>

          <!-- Unit -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-sm">Unit</span>
            </label>
            <select
              v-model="filterUnitId"
              @change="fetchEntries"
              class="select select-bordered select-sm"
            >
              <option value="">Semua Unit</option>
              <option v-for="unit in filteredUnits" :key="unit.id" :value="unit.id">
                {{ unit.name }}
              </option>
            </select>
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
              <option value="">Semua</option>
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
        </div>
        
        <!-- Reset Button -->
        <div class="flex justify-end mt-3">
          <button @click="resetFilters" class="btn btn-outline btn-sm">
            Reset Filter
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat bg-base-100 border border-base-300 rounded-lg p-4">
        <div class="stat-title text-xs">Total Entri</div>
        <div class="stat-value text-2xl">{{ entries.length }}</div>
      </div>
      <div class="stat bg-warning/10 border border-warning/30 rounded-lg p-4">
        <div class="stat-title text-xs">Diajukan</div>
        <div class="stat-value text-2xl text-warning">{{ entries.filter(e => e.status === 'proposed').length }}</div>
      </div>
      <div class="stat bg-info/10 border border-info/30 rounded-lg p-4">
        <div class="stat-title text-xs">Terverifikasi</div>
        <div class="stat-value text-2xl text-info">{{ entries.filter(e => e.status === 'checked').length }}</div>
      </div>
      <div class="stat bg-success/10 border border-success/30 rounded-lg p-4">
        <div class="stat-title text-xs">Selesai</div>
        <div class="stat-value text-2xl text-success">{{ entries.filter(e => e.status === 'finish').length }}</div>
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
                <th>Tanggal</th>
                <th v-if="!isManager">Divisi</th>
                <th>Unit</th>
                <th>Frekuensi</th>
                <th>Dibuat Oleh</th>
                <th>Status</th>
                <th>Indikator</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="isManager ? 8 : 9" class="text-center py-8">
                  <span class="loading loading-spinner loading-lg"></span>
                </td>
              </tr>
              <tr v-else-if="filteredEntries.length === 0">
                <td :colspan="isManager ? 8 : 9" class="text-center py-8 text-base-content/60">
                  Tidak ada entri ditemukan
                </td>
              </tr>
              <tr v-else v-for="entry in filteredEntries" :key="entry.id" class="hover">
                <td class="font-medium">{{ entry.entryCode }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <Calendar class="w-4 h-4 text-base-content/50" />
                    {{ formatDate(entry.entryDate) }}
                  </div>
                </td>
                <td v-if="!isManager">
                  <span class="badge badge-ghost badge-sm">{{ entry.division?.name || '-' }}</span>
                </td>
                <td>{{ entry.unit?.name || '-' }}</td>
                <td>
                  <span class="badge badge-primary badge-sm">
                    {{ entry.entryFrequency === 'daily' ? 'Harian' : 'Bulanan' }}
                  </span>
                </td>
                <td class="text-sm">{{ entry.createdByUser?.name || '-' }}</td>
                <td>
                  <span :class="['badge badge-sm gap-1', getStatusBadge(entry.status)]">
                    <component :is="getStatusIcon(entry.status)" class="w-3 h-3" />
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
                <td class="text-center">
                  <button
                    @click="openStatusModal(entry)"
                    class="btn btn-sm btn-primary gap-1"
                  >
                    <CheckCircle class="w-4 h-4" />
                    Verifikasi
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Status Update Modal -->
    <Teleport to="body">
      <dialog :class="{ 'modal modal-open': showStatusModal, 'modal': !showStatusModal }">
        <div class="modal-box max-w-2xl p-0 overflow-hidden border border-base-300 shadow-2xl bg-base-100 ring-1 ring-base-content/5">
          <!-- Modal Header -->
          <div class="p-6 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <CheckCircle class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 class="font-bold text-xl text-base-content">Verifikasi Entri</h3>
                <p class="text-xs text-base-content/60">Perbarui status dan tinjau riwayat verifikasi</p>
              </div>
            </div>
            <button @click="closeStatusModal" class="btn btn-ghost btn-sm btn-circle">✕</button>
          </div>
          
          <div v-if="selectedEntry" class="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <!-- Entry Summary Card -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base-200/40 p-5 rounded-2xl border border-base-300/50 group transition-all duration-300 hover:bg-base-200/60">
              <div class="space-y-1">
                <span class="text-[10px] uppercase tracking-wider font-bold text-base-content/40">Informasi Entri</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-base text-base-content">{{ selectedEntry.entryCode }}</span>
                  <span class="badge badge-sm badge-ghost border-base-300">{{ selectedEntry.entryFrequency === 'daily' ? 'Harian' : 'Bulanan' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-sm text-base-content/70">
                  <User class="w-3.5 h-3.5" />
                  <span>{{ selectedEntry.unit?.name }}</span>
                </div>
              </div>
              <div class="md:text-right space-y-1">
                <span class="text-[10px] uppercase tracking-wider font-bold text-base-content/40">Status & Tanggal</span>
                <div class="flex md:justify-end">
                  <span :class="['badge badge-sm gap-1 font-medium px-3', getStatusBadge(selectedEntry.status)]">
                    <component :is="getStatusIcon(selectedEntry.status)" class="w-3 h-3" />
                    {{ getStatusLabel(selectedEntry.status).toUpperCase() }}
                  </span>
                </div>
                <div class="flex items-center md:justify-end gap-1.5 text-sm text-base-content/70">
                  <Calendar class="w-3.5 h-3.5" />
                  <span>{{ formatDate(selectedEntry.entryDate) }}</span>
                </div>
              </div>
            </div>

            <!-- Role Notification -->
            <div class="flex items-start gap-3 p-4 bg-info/5 border border-info/20 rounded-xl">
              <div class="mt-0.5">
                <Info class="w-5 h-5 text-info" />
              </div>
              <div>
                <h4 class="text-sm font-semibold text-info-content/80">Izin Verifikasi</h4>
                <p class="text-xs text-info-content/70 mt-0.5">
                  Role: <span class="font-bold underline decoration-info/30 uppercase tracking-tight">{{ user?.role }}</span>. 
                  Dapat memverifikasi ke: <span class="font-medium px-1.5 py-0.5 bg-info/10 rounded">{{ allowedStatuses.join(' or ') }}</span>
                </p>
              </div>
            </div>

            <!-- Status Transition Selection & Notes (Only if not finish) -->
            <template v-if="selectedEntry.status !== 'finish'">
              <!-- Status Transition Selection -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-bold uppercase tracking-tight text-base-content/60 flex items-center gap-2">
                    <ArrowRight class="w-4 h-4" />
                    Pilih Status Baru
                  </h4>
                  <span class="text-[10px] bg-error text-error-content px-2 py-0.5 rounded-full font-bold">WAJIB</span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    v-for="status in allowedStatuses" 
                    :key="status"
                    @click="newStatus = status"
                    class="relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-300 group overflow-hidden"
                    :class="newStatus === status 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'border-base-300 hover:bg-base-200'"
                  >
                    <div class="flex items-center justify-between w-full mb-3">
                      <div :class="['p-2 rounded-lg transition-colors', newStatus === status ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/50 group-hover:bg-primary/20 group-hover:text-primary']">
                        <component :is="getStatusIcon(status)" class="w-5 h-5" />
                      </div>
                      <div v-if="newStatus === status" class="w-5 h-5 bg-primary text-primary-content rounded-full flex items-center justify-center">
                        <Check class="w-3 h-3" />
                      </div>
                      <div v-else class="w-5 h-5 border-2 border-base-300 rounded-full"></div>
                    </div>
                    <span class="font-bold text-base transition-colors capitalize" :class="newStatus === status ? 'text-primary' : 'text-base-content/70'">
                      {{ getStatusLabel(status) }}
                    </span>
                    <span class="text-[10px] text-base-content/40 font-medium uppercase mt-1">Transisi ke {{ getStatusLabel(status) }}</span>
                    <div v-if="newStatus === status" class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transform -rotate-12 transition-all duration-500">
                      <component :is="getStatusIcon(status)" class="w-24 h-24" />
                    </div>
                  </button>
                </div>
              </div>

              <!-- Notes Section -->
              <div class="space-y-2">
                <h4 class="text-sm font-bold uppercase tracking-tight text-base-content/60 flex items-center gap-2">
                  <MessageSquare class="w-4 h-4" />
                  Catatan Verifikasi
                </h4>
                <textarea
                  v-model="auditorNotes"
                  class="textarea textarea-bordered w-full h-28 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm leading-relaxed custom-scrollbar bg-base-200/30"
                  placeholder="Tuliskan alasan atau catatan tambahan di sini... (opsional)"
                ></textarea>
              </div>
            </template>

            <!-- Finished Notice -->
            <div v-else class="flex flex-col items-center justify-center p-8 bg-success/5 border border-success/20 rounded-2xl text-center">
              <div class="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle class="w-10 h-10 text-success" />
              </div>
              <h4 class="text-lg font-bold text-success">Verifikasi Selesai</h4>
              <p class="text-sm text-base-content/60 mt-2 max-w-xs">
                Entri ini telah mencapai status final dan tidak dapat diubah lagi. Silakan tinjau riwayat aktivitas di bawah ini.
              </p>
            </div>

            <!-- Timeline Section -->
            <div class="space-y-4 pt-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold uppercase tracking-tight text-base-content/60 flex items-center gap-2">
                  <History class="w-4 h-4" />
                  Riwayat Aktivitas
                </h4>
                <div v-if="loadingLogs" class="loading loading-spinner loading-xs text-primary"></div>
              </div>
              
              <div v-if="verificationLogs.length === 0" class="flex flex-col items-center justify-center py-10 px-4 bg-base-200/30 rounded-2xl border-2 border-dashed border-base-300">
                <div class="p-4 bg-base-300/50 rounded-full mb-3">
                  <History class="w-8 h-8 text-base-content/20" />
                </div>
                <p class="text-sm text-base-content/40 font-medium">Belum ada riwayat verifikasi untuk entri ini</p>
              </div>
              
              <div v-else class="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-base-300">
                <div 
                  v-for="(log, index) in verificationLogs" 
                  :key="log.id"
                  class="relative pl-10 group"
                >
                  <!-- Timeline Dot -->
                  <div class="absolute left-0 top-1.5 w-[36px] h-[36px] flex items-center justify-center z-10">
                    <div class="w-3 h-3 rounded-full bg-base-300 border-[3px] border-base-100 group-first:bg-primary group-first:w-4 group-first:h-4 transition-all"
                         :class="{'animate-pulse bg-primary/50': index === 0}"></div>
                  </div>
                  
                  <div class="bg-base-200/50 hover:bg-base-200 rounded-xl p-4 border border-base-300/50 transition-all duration-300 group-hover:bg-base-200">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span :class="['badge badge-sm font-bold', getStatusBadge(log.previousStatus)]">
                          {{ getStatusLabel(log.previousStatus).toUpperCase() }}
                        </span>
                        <ArrowRight class="w-3 h-3 text-base-content/30" />
                        <span :class="['badge badge-sm font-bold', getStatusBadge(log.newStatus)]">
                          {{ getStatusLabel(log.newStatus).toUpperCase() }}
                        </span>
                      </div>
                      <span class="text-[10px] font-bold text-base-content/40 bg-base-300/50 px-2 py-0.5 rounded">
                        {{ formatDate(log.createdAt) }}
                      </span>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <div class="avatar placeholder">
                        <div class="bg-primary/10 text-primary rounded-full w-8 h-8 ring-2 ring-primary/20">
                          <span class="text-xs font-bold">{{ log.createdBy?.name?.charAt(0) || '?' }}</span>
                        </div>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-base-content">{{ log.createdBy?.name || 'Tidak diketahui' }}</span>
                        <span class="text-[10px] text-primary/70 uppercase tracking-wider font-bold">{{ log.createdBy?.role || 'Staff' }}</span>
                      </div>
                    </div>
                    
                    <div v-if="log.notes" class="mt-3 p-3 bg-base-100/50 rounded-lg border border-base-300 shadow-inner group-hover:bg-base-100 transition-colors">
                      <div class="flex gap-2">
                        <MessageSquare class="w-3 h-3 text-primary/50 mt-0.5" />
                        <p class="text-sm text-base-content italic leading-relaxed">
                          "{{ log.notes }}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Action -->
          <div class="p-6 border-t border-base-300 bg-base-200/50 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button 
              class="btn btn-ghost order-2 sm:order-1 font-bold text-base-content/60 hover:text-base-content" 
              @click="closeStatusModal" 
              :disabled="updatingStatus"
            >
              {{ selectedEntry?.status === 'finish' ? 'TUTUP' : 'BATAL' }}
            </button>
            <button 
              v-if="selectedEntry && selectedEntry.status !== 'finish'"
              class="btn btn-primary px-8 order-1 sm:order-2 font-bold shadow-lg shadow-primary/20 gap-2" 
              @click="updateEntryStatus"
              :disabled="updatingStatus || !newStatus || allowedStatuses.length === 0"
            >
              <template v-if="updatingStatus">
                <span class="loading loading-spinner loading-sm"></span>
                MEMPROSES...
              </template>
              <template v-else>
                <CheckCircle class="w-4 h-4" />
                SIMPAN PERUBAHAN
              </template>
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop bg-base-content/40" @click="closeStatusModal">
          <button>tutup</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Calculated Indicators Modal -->
    <CalculatedIndicatorsModal
      :is-open="showCalculatedModal"
      :selected-entry="selectedCalculatedEntry"
      @close="closeCalculatedModal"
      @viewDetail="() => {}"
    />

    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-[10000] space-y-2 pointer-events-none">
      <TransitionGroup name="notification" tag="div">
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
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.1);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.2);
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
