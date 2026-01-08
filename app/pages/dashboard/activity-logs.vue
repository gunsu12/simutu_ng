<script setup lang="ts">
import { Search, RefreshCw, Trash2, Filter, Activity, User, Clock, Monitor, ChevronLeft, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

interface ActivityLog {
  id: string
  userId: string | null
  userName: string
  userEmail: string
  action: string
  module: string
  description: string
  details: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface Stats {
  total: number
  actionStats: { action: string; count: number }[]
  moduleStats: { module: string; count: number }[]
  dailyStats: { date: string; count: number }[]
  oldestLogDate: string | null
}

const searchQuery = ref('')
const actionFilter = ref('')
const moduleFilter = ref('')
const now = new Date()
const lastWeek = new Date(now)
lastWeek.setDate(now.getDate() - 6)

const startDate = ref(lastWeek.toISOString().split('T')[0])
const endDate = ref(now.toISOString().split('T')[0])

const page = ref(1)
const limit = ref(25)
const logs = ref<ActivityLog[]>([])
const total = ref(0)
const totalPages = ref(0)
const stats = ref<Stats | null>(null)
const loading = ref(false)
const loadingStats = ref(false)
const cleaningUp = ref(false)

const actionColors: Record<string, string> = {
  LOGIN: 'badge-success',
  LOGOUT: 'badge-info',
  CREATE: 'badge-primary',
  UPDATE: 'badge-warning',
  DELETE: 'badge-error',
  VIEW: 'badge-ghost',
  UPLOAD: 'badge-secondary',
  DOWNLOAD: 'badge-accent',
  VERIFY: 'badge-success',
  STATUS_CHANGE: 'badge-warning',
  EXPORT: 'badge-info',
}

const moduleLabels: Record<string, string> = {
  auth: 'Autentikasi',
  users: 'Pengguna',
  sites: 'Site',
  divisions: 'Divisi',
  units: 'Unit',
  employees: 'Karyawan',
  indicators: 'Indikator',
  'indicator-categories': 'Kategori Indikator',
  'indicator-entries': 'Entry Indikator',
  'indicator-pdcas': 'PDCA',
  reports: 'Laporan',
  settings: 'Pengaturan',
  'activity-logs': 'Activity Logs',
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.append('page', page.value.toString())
    params.append('limit', limit.value.toString())
    
    if (searchQuery.value) params.append('search', searchQuery.value)
    if (actionFilter.value) params.append('action', actionFilter.value)
    if (moduleFilter.value) params.append('module', moduleFilter.value)
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)
    
    const response = await $fetch<{ success: boolean; data: ActivityLog[]; meta: { total: number; totalPages: number } }>(`/api/activity-logs?${params.toString()}`)
    
    if (response.success) {
      logs.value = response.data
      total.value = response.meta.total
      totalPages.value = response.meta.totalPages
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  loadingStats.value = true
  try {
    const response = await $fetch<{ success: boolean; data: Stats }>('/api/activity-logs/stats')
    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
  } finally {
    loadingStats.value = false
  }
}

const cleanupLogs = async () => {
  if (!confirm('Apakah Anda yakin ingin membersihkan activity logs yang lebih dari 1 minggu?')) {
    return
  }
  
  cleaningUp.value = true
  try {
    const response = await $fetch<{ success: boolean; message: string; data: { deletedCount: number } }>('/api/activity-logs/cleanup', {
      method: 'DELETE',
    })
    
    if (response.success) {
      alert(response.message)
      fetchLogs()
      fetchStats()
    }
  } catch (error: any) {
    console.error('Error cleaning up logs:', error)
    alert(error.data?.message || 'Gagal membersihkan logs')
  } finally {
    cleaningUp.value = false
  }
}

const applyFilters = () => {
  page.value = 1
  fetchLogs()
}

const resetFilters = () => {
  searchQuery.value = ''
  actionFilter.value = ''
  moduleFilter.value = ''
  
  const now = new Date()
  const lastWeek = new Date(now)
  lastWeek.setDate(now.getDate() - 6)
  
  startDate.value = lastWeek.toISOString().split('T')[0]
  endDate.value = now.toISOString().split('T')[0]
  
  page.value = 1
  fetchLogs()
}

const goToPage = (newPage: number) => {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage
    fetchLogs()
  }
}

const formatDate = (dateString: string) => {
  // Database stores local time (Asia/Makassar), parse and display as-is
  const date = new Date(dateString)
  // Adjust for the timezone offset that JavaScript adds when parsing
  // Since DB stores local time but JS interprets as UTC, we need to display without conversion
  const day = date.getUTCDate().toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const month = months[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const seconds = date.getUTCSeconds().toString().padStart(2, '0')
  
  return `${day} ${month} ${year}, ${hours}.${minutes}.${seconds}`
}

const getDeviceInfo = (userAgent: string | null) => {
  if (!userAgent) return 'Unknown'
  
  if (userAgent.includes('Mobile')) return 'Mobile'
  if (userAgent.includes('Tablet')) return 'Tablet'
  return 'Desktop'
}

const getBrowserInfo = (userAgent: string | null) => {
  if (!userAgent) return 'Unknown'
  
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'Other'
}

// Initial fetch
onMounted(() => {
  fetchLogs()
  fetchStats()
})

// Watch for search with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchLogs()
  }, 500)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content flex items-center gap-2">
          <Activity class="w-6 h-6" />
          Activity Logs
        </h1>
        <p class="text-base-content/60 mt-1">Monitor aktivitas pengguna di sistem. Logs otomatis dihapus setelah 1 minggu.</p>
      </div>
      <div class="flex gap-2">
        <button 
          class="btn btn-outline gap-2"
          @click="fetchLogs(); fetchStats()"
          :disabled="loading"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button 
          class="btn btn-error gap-2"
          @click="cleanupLogs"
          :disabled="cleaningUp"
        >
          <Trash2 class="w-4 h-4" />
          Cleanup
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 p-3 rounded-lg">
              <Activity class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="text-base-content/60 text-sm">Total Logs</p>
              <p class="text-2xl font-bold">{{ stats?.total || 0 }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="bg-success/10 p-3 rounded-lg">
              <User class="w-5 h-5 text-success" />
            </div>
            <div>
              <p class="text-base-content/60 text-sm">Login Hari Ini</p>
              <p class="text-2xl font-bold">
                {{ stats?.actionStats.find(s => s.action === 'LOGIN')?.count || 0 }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="bg-warning/10 p-3 rounded-lg">
              <Clock class="w-5 h-5 text-warning" />
            </div>
            <div>
              <p class="text-base-content/60 text-sm">Log Tertua</p>
              <p class="text-sm font-medium">
                {{ stats?.oldestLogDate ? formatDate(stats.oldestLogDate) : '-' }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="bg-info/10 p-3 rounded-lg">
              <Monitor class="w-5 h-5 text-info" />
            </div>
            <div>
              <p class="text-base-content/60 text-sm">Aktivitas 7 Hari</p>
              <p class="text-2xl font-bold">
                {{ stats?.dailyStats.reduce((sum, d) => sum + d.count, 0) || 0 }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <div class="flex flex-col lg:flex-row gap-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari berdasarkan deskripsi, nama, atau email..."
              class="input input-bordered w-full pl-10"
            />
          </div>
          <select v-model="actionFilter" @change="applyFilters" class="select select-bordered w-full lg:w-auto">
            <option value="">Semua Aksi</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="VIEW">View</option>
            <option value="VERIFY">Verify</option>
            <option value="STATUS_CHANGE">Status Change</option>
          </select>
          <select v-model="moduleFilter" @change="applyFilters" class="select select-bordered w-full lg:w-auto">
            <option value="">Semua Modul</option>
            <option v-for="(label, key) in moduleLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <input 
            v-model="startDate" 
            @change="applyFilters"
            type="date" 
            class="input input-bordered w-full lg:w-auto" 
            placeholder="Dari Tanggal"
          />
          <input 
            v-model="endDate" 
            @change="applyFilters"
            type="date" 
            class="input input-bordered w-full lg:w-auto" 
            placeholder="Sampai Tanggal"
          />
          <button @click="resetFilters" class="btn btn-ghost">
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>Waktu</th>
              <th>User</th>
              <th>Aksi</th>
              <th>Modul</th>
              <th>Deskripsi</th>
              <th>IP Address</th>
              <th>Browser</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center py-8">
                <span class="loading loading-spinner loading-md"></span>
                <p class="mt-2 text-base-content/60">Memuat data...</p>
              </td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="7" class="text-center py-8">
                <Activity class="w-12 h-12 mx-auto text-base-content/30" />
                <p class="mt-2 text-base-content/60">Tidak ada activity logs</p>
              </td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-base-200/30">
              <td class="whitespace-nowrap text-sm">
                {{ formatDate(log.createdAt) }}
              </td>
              <td>
                <div class="flex items-center gap-3">
                  <div class="avatar placeholder">
                    <div class="bg-neutral text-neutral-content rounded-full w-8 h-8">
                      <span class="text-xs">{{ log.userName.charAt(0).toUpperCase() }}</span>
                    </div>
                  </div>
                  <div>
                    <div class="font-medium text-sm">{{ log.userName }}</div>
                    <div class="text-xs text-base-content/60">{{ log.userEmail }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['badge badge-sm', actionColors[log.action] || 'badge-ghost']">
                  {{ log.action }}
                </span>
              </td>
              <td>
                <span class="text-sm">{{ moduleLabels[log.module] || log.module }}</span>
              </td>
              <td class="max-w-xs">
                <p class="text-sm truncate" :title="log.description">{{ log.description }}</p>
                <details v-if="log.details" class="text-xs text-base-content/60">
                  <summary class="cursor-pointer hover:text-primary">Lihat detail</summary>
                  <pre class="mt-2 p-2 bg-base-200 rounded text-xs overflow-x-auto">{{ JSON.stringify(log.details, null, 2) }}</pre>
                </details>
              </td>
              <td class="text-sm text-base-content/70">{{ log.ipAddress || '-' }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="text-sm">{{ getBrowserInfo(log.userAgent) }}</span>
                  <span class="badge badge-xs">{{ getDeviceInfo(log.userAgent) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-base-300">
        <div class="text-sm text-base-content/60">
          Menampilkan {{ logs.length }} dari {{ total }} logs
        </div>
        <div class="flex items-center gap-2">
          <button 
            class="btn btn-sm btn-ghost"
            @click="goToPage(page - 1)"
            :disabled="page <= 1"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-sm">
            Halaman {{ page }} dari {{ totalPages }}
          </span>
          <button 
            class="btn btn-sm btn-ghost"
            @click="goToPage(page + 1)"
            :disabled="page >= totalPages"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
