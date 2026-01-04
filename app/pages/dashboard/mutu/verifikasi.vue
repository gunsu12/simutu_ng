<script setup lang="ts">
import { Search, Calendar, Eye, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-vue-next'

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
const filterStartDate = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
const filterEndDate = ref(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])
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
    const message = error.data?.message || error.message || 'Failed to fetch entries'
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
  filterStartDate.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  filterEndDate.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
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
          Manager View
        </span>
        <span v-else class="badge badge-primary badge-lg gap-2">
          <CheckCircle class="w-4 h-4" />
          Auditor View
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
              <option value="proposed">Proposed</option>
              <option value="checked">Checked</option>
              <option value="pending">Pending</option>
              <option value="finish">Finish</option>
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

    <!-- Search -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-5 h-5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari entri berdasarkan kode, unit, atau divisi..."
            class="input input-bordered w-full pl-10"
          />
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
        <div class="stat-title text-xs">Proposed</div>
        <div class="stat-value text-2xl text-warning">{{ entries.filter(e => e.status === 'proposed').length }}</div>
      </div>
      <div class="stat bg-info/10 border border-info/30 rounded-lg p-4">
        <div class="stat-title text-xs">Checked</div>
        <div class="stat-value text-2xl text-info">{{ entries.filter(e => e.status === 'checked').length }}</div>
      </div>
      <div class="stat bg-success/10 border border-success/30 rounded-lg p-4">
        <div class="stat-title text-xs">Finish</div>
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
                    {{ entry.status }}
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
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">Update Status Verifikasi</h3>
          
          <div v-if="selectedEntry" class="space-y-4">
            <!-- Entry Info -->
            <div class="bg-base-200 p-4 rounded-lg space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-base-content/60">Kode Entri:</span>
                <span class="font-medium">{{ selectedEntry.entryCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-base-content/60">Unit:</span>
                <span class="font-medium">{{ selectedEntry.unit?.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-base-content/60">Tanggal:</span>
                <span class="font-medium">{{ formatDate(selectedEntry.entryDate) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-base-content/60">Status Saat Ini:</span>
                <span :class="['badge badge-sm', getStatusBadge(selectedEntry.status)]">
                  {{ selectedEntry.status }}
                </span>
              </div>
            </div>

            <!-- Role Info -->
            <div class="alert alert-info py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm">
                Role Anda: <strong>{{ user?.role }}</strong> - Dapat mengubah status ke: 
                <span class="font-semibold">{{ allowedStatuses.join(', ') }}</span>
              </span>
            </div>

            <!-- Status Selection -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Status Baru <span class="text-error">*</span></span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label 
                  v-for="status in allowedStatuses" 
                  :key="status"
                  class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="newStatus === status ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'"
                >
                  <input
                    type="radio"
                    :value="status"
                    v-model="newStatus"
                    class="radio radio-primary radio-sm"
                  />
                  <span :class="['badge badge-sm gap-1', getStatusBadge(status)]">
                    <component :is="getStatusIcon(status)" class="w-3 h-3" />
                    {{ status }}
                  </span>
                </label>
              </div>
            </div>

            <!-- Auditor Notes -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Catatan Verifikasi</span>
              </label>
              <textarea
                v-model="auditorNotes"
                class="textarea textarea-bordered h-24"
                placeholder="Tambahkan catatan verifikasi (opsional)..."
              ></textarea>
            </div>

            <!-- Verification History -->
            <div class="divider">Riwayat Verifikasi</div>
            
            <div v-if="loadingLogs" class="flex justify-center py-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
            <div v-else-if="verificationLogs.length === 0" class="text-center text-base-content/60 py-4">
              Belum ada riwayat verifikasi
            </div>
            <div v-else class="space-y-3 max-h-48 overflow-y-auto">
              <div 
                v-for="log in verificationLogs" 
                :key="log.id"
                class="bg-base-200 p-3 rounded-lg text-sm"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span :class="['badge badge-xs', getStatusBadge(log.previousStatus)]">
                      {{ log.previousStatus }}
                    </span>
                    <span class="text-base-content/60">→</span>
                    <span :class="['badge badge-xs', getStatusBadge(log.newStatus)]">
                      {{ log.newStatus }}
                    </span>
                  </div>
                  <span class="text-xs text-base-content/60">
                    {{ formatDate(log.createdAt) }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="font-medium">{{ log.createdBy?.name || 'Unknown' }}</span>
                  <span class="badge badge-ghost badge-xs">{{ log.createdBy?.role || '-' }}</span>
                </div>
                <p v-if="log.notes" class="mt-2 text-xs text-base-content/70 italic">
                  "{{ log.notes }}"
                </p>
              </div>
            </div>
          </div>

          <div class="modal-action">
            <button class="btn" @click="closeStatusModal" :disabled="updatingStatus">Batal</button>
            <button 
              class="btn btn-primary" 
              @click="updateEntryStatus"
              :disabled="updatingStatus || !newStatus || allowedStatuses.length === 0"
            >
              <span v-if="updatingStatus" class="loading loading-spinner loading-sm"></span>
              {{ updatingStatus ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop" @click="closeStatusModal">
          <button>close</button>
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
