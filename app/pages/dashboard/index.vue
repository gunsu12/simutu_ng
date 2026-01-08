<script setup lang="ts">
import { Activity, FileText, AlertCircle, CheckCircle, Calendar, Filter, ClipboardList, Eye } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { user } = useAuth()

// Filters
const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())
const selectedUnitId = ref<string | null>(user.value?.unitId || null)

// Units list for filter
const { data: unitsData } = await useFetch('/api/units', {
  query: computed(() => ({
    siteId: user.value?.siteId
  }))
})

const units = computed(() => {
  const response = unitsData.value as any
  return response?.data || []
})

// Dashboard Stats
const { data: statsData, refresh: refreshStats } = await useFetch('/api/dashboard/stats', {
  query: computed(() => ({
    month: selectedMonth.value,
    year: selectedYear.value,
    unitId: selectedUnitId.value || undefined
  }))
})

const stats = computed(() => {
  const response = statsData.value as any
  return response?.data || {
    activeIndicators: 0,
    entriesThisMonth: 0,
    pdcasCreated: 0,
    unfinishedEntries: 0
  }
})

// Daily Entries
const { data: dailyEntriesData, refresh: refreshDailyEntries } = await useFetch('/api/dashboard/daily-entries', {
  query: computed(() => ({
    unitId: selectedUnitId.value || undefined,
    limit: 10
  }))
})

const dailyEntries = computed(() => {
  const response = dailyEntriesData.value as any
  return response?.data || []
})

// Watch for filter changes
watch([selectedMonth, selectedYear, selectedUnitId], () => {
  refreshStats()
  refreshDailyEntries()
})

// Stats cards configuration
const statCards = computed(() => [
  {
    title: 'Indikator Aktif',
    value: stats.value.activeIndicators,
    description: 'Total indikator yang aktif',
    icon: Activity,
    iconBgColor: 'bg-primary/10',
    iconColor: 'text-primary'
  },
  {
    title: 'Entri Bulan Ini',
    value: stats.value.entriesThisMonth,
    description: 'Jumlah entri indikator',
    icon: FileText,
    iconBgColor: 'bg-success/10',
    iconColor: 'text-success'
  },
  {
    title: 'PDCA Dibuat',
    value: stats.value.pdcasCreated,
    description: 'Total PDCA bulan ini',
    icon: ClipboardList,
    iconBgColor: 'bg-info/10',
    iconColor: 'text-info'
  },
  {
    title: 'Entri Belum Selesai',
    value: stats.value.unfinishedEntries,
    description: 'Menunggu verifikasi',
    icon: AlertCircle,
    iconBgColor: 'bg-warning/10',
    iconColor: 'text-warning'
  }
])

// Month options
const months = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
]

// Generate year options (current year and 2 years back)
const years = computed(() => {
  const current = new Date().getFullYear()
  return [current, current - 1, current - 2]
})

// Status badge class
const getStatusClass = (status: string) => {
  switch (status) {
    case 'finish': return 'badge-success'
    case 'checked': return 'badge-info'
    case 'pending': return 'badge-warning'
    case 'proposed': return 'badge-ghost'
    default: return 'badge-ghost'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'finish': return 'Selesai'
    case 'checked': return 'Terverifikasi'
    case 'pending': return 'Tertunda'
    case 'proposed': return 'Diajukan'
    default: return status
  }
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">
          Selamat datang, {{ user?.name?.split(' ')[0] || 'Pengguna' }}! 👋
        </h1>
        <p class="text-base-content/60 mt-1">Ringkasan data mutu untuk dashboard Anda.</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body py-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <Filter class="w-4 h-4 text-base-content/60" />
            <span class="text-sm font-medium">Filter:</span>
          </div>
          
          <!-- Month Filter -->
          <div class="form-control">
            <select v-model="selectedMonth" class="select select-bordered select-sm">
              <option v-for="m in months" :key="m.value" :value="m.value">
                {{ m.label }}
              </option>
            </select>
          </div>

          <!-- Year Filter -->
          <div class="form-control">
            <select v-model="selectedYear" class="select select-bordered select-sm">
              <option v-for="y in years" :key="y" :value="y">
                {{ y }}
              </option>
            </select>
          </div>

          <!-- Unit Filter -->
          <div class="form-control">
            <select v-model="selectedUnitId" class="select select-bordered select-sm min-w-[200px]">
              <option :value="null">Semua Unit</option>
              <option v-for="unit in units" :key="unit.id" :value="unit.id">
                {{ unit.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        v-for="stat in statCards" 
        :key="stat.title"
        class="card bg-base-100 border border-base-300 shadow-sm"
      >
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-base-content/60">{{ stat.title }}</p>
              <p class="text-3xl font-bold mt-1">{{ stat.value }}</p>
              <p class="text-xs text-base-content/50 mt-1">{{ stat.description }}</p>
            </div>
            <div :class="['p-3 rounded-lg', stat.iconBgColor]">
              <component :is="stat.icon" :class="['w-6 h-6', stat.iconColor]" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Daily Entries Section -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Calendar class="w-5 h-5 text-primary" />
            <h2 class="card-title text-lg">Entri Harian Hari Ini</h2>
          </div>
          <NuxtLink to="/dashboard/mutu/nilai-unit" class="btn btn-ghost btn-sm">
            Lihat Semua
          </NuxtLink>
        </div>

        <div v-if="dailyEntries.length === 0" class="text-center py-8 text-base-content/50">
          <FileText class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada entri harian untuk hari ini</p>
          <p class="text-sm mt-1">Entri dengan frekuensi harian akan ditampilkan di sini</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Kode Entri</th>
                <th>Unit</th>
                <th>Tanggal</th>
                <th>Jumlah Item</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in dailyEntries" :key="entry.id">
                <td class="font-mono text-sm">{{ entry.entryCode }}</td>
                <td>{{ entry.unit?.name || '-' }}</td>
                <td class="text-base-content/60 text-sm">{{ formatDate(entry.entryDate) }}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <span class="font-medium">{{ entry.completedItems }}</span>
                    <span class="text-base-content/50">/</span>
                    <span>{{ entry.itemsCount }}</span>
                    <span class="text-xs text-base-content/50 ml-1">terisi</span>
                  </div>
                </td>
                <td>
                  <span :class="['badge badge-sm', getStatusClass(entry.status)]">
                    {{ getStatusLabel(entry.status) }}
                  </span>
                </td>
                <td>
                  <NuxtLink 
                    :to="`/dashboard/mutu/nilai-unit?id=${entry.id}`" 
                    class="btn btn-ghost btn-xs gap-1"
                  >
                    <Eye class="w-3 h-3" />
                    Detail
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <NuxtLink 
        to="/dashboard/mutu/nilai-unit" 
        class="card bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer"
      >
        <div class="card-body py-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <FileText class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="font-medium">Buat Entri Baru</p>
              <p class="text-sm text-base-content/60">Tambah entri indikator</p>
            </div>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink 
        to="/dashboard/mutu/nilai-unit?status=pending,proposed" 
        class="card bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer"
      >
        <div class="card-body py-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-warning/10 rounded-lg">
              <AlertCircle class="w-5 h-5 text-warning" />
            </div>
            <div>
              <p class="font-medium">Entri Tertunda</p>
              <p class="text-sm text-base-content/60">Lihat entri yang perlu diselesaikan</p>
            </div>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink 
        to="/dashboard/mutu/indicator-pdcas" 
        class="card bg-info/5 border border-info/20 hover:bg-info/10 transition-colors cursor-pointer"
      >
        <div class="card-body py-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-info/10 rounded-lg">
              <ClipboardList class="w-5 h-5 text-info" />
            </div>
            <div>
              <p class="font-medium">Daftar PDCA</p>
              <p class="text-sm text-base-content/60">Kelola dokumen PDCA</p>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
