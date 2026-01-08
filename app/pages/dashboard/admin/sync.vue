<script setup lang="ts">
import { RefreshCw, Database, ArrowRightLeft } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', (to, from) => {
    const { user } = useAuth()
    if (user.value?.role !== 'admin') {
      return navigateTo('/dashboard')
    }
  }]
})

// --- Employee Sync State ---
const isEmployeeSyncLoading = ref(false)
const employeeSyncResult = ref<any>(null)
const employeeSyncError = ref<string | null>(null)

const employeeFormData = reactive({
  url: 'http://localhost/bros_hrs/public/api/sync/employees',
  apiKey: 'sk_NTI3OTU2ODY5NjU3YjZlMzQ5ZjEyNTA1ZjFlMDIwNGYwNjBkZDUzMzEyNTIxYzNmOWM3NTMxNGY3ZGQ5ZjYxNg=='
})

const handleEmployeeSync = async () => {
  isEmployeeSyncLoading.value = true
  employeeSyncError.value = null
  employeeSyncResult.value = null

  try {
    const response = await $fetch('/api/sync/employees', {
      method: 'POST',
      body: {
        url: employeeFormData.url,
        apiKey: employeeFormData.apiKey
      }
    })
    employeeSyncResult.value = response
    useToast().add({
      title: 'Berhasil',
      description: 'Sinkronisasi data karyawan berhasil.',
      color: 'green'
    })
  } catch (err: any) {
    employeeSyncError.value = err.data?.message || err.message || 'Terjadi kesalahan saat sinkronisasi.'
    useToast().add({
      title: 'Kesalahan',
      description: employeeSyncError.value,
      color: 'red'
    })
  } finally {
    isEmployeeSyncLoading.value = false
  }
}

// --- Indicator Migration State ---
const isIndMigrationLoading = ref(false)
const indMigrationResult = ref<any>(null)
const indMigrationError = ref<string | null>(null)

const indicatorFormData = reactive({
  host: 'localhost',
  port: '3306',
  user: 'root',
  password: '',
  database: 'db_simutu',
  siteId: ''
})

// --- Site Fetching ---
const { data: sitesData } = await useFetch('/api/sites')
const sites = computed(() => sitesData.value?.data || [])

// Set default site if available
watchEffect(() => {
  if (sites.value.length > 0 && !indicatorFormData.siteId) {
    indicatorFormData.siteId = sites.value[0].id
  }
})

const isTestingConnection = ref(false)

const handleTestConnection = async () => {
    isTestingConnection.value = true
    try {
        await $fetch('/api/sync/test-connection', {
            method: 'POST',
            body: { ...indicatorFormData }
        })
        useToast().add({
            title: 'Koneksi Berhasil',
            description: 'Dapat terhubung ke database MySQL.',
            color: 'green'
        })
    } catch (err: any) {
        useToast().add({
            title: 'Koneksi Gagal',
            description: err.data?.message || err.message,
            color: 'red'
        })
    } finally {
        isTestingConnection.value = false
    }
}

const handleIndicatorMigration = async () => {
  isIndMigrationLoading.value = true
  indMigrationError.value = null
  indMigrationResult.value = null

  if (!indicatorFormData.siteId) {
    indMigrationError.value = 'Silakan pilih Site tujuan terlebih dahulu.'
    isIndMigrationLoading.value = false
    return
  }

  try {
    const response = await $fetch('/api/sync/indicators', {
      method: 'POST',
      body: { ...indicatorFormData }
    })
    indMigrationResult.value = response
    useToast().add({
      title: 'Berhasil',
      description: 'Migrasi indikator berhasil.',
      color: 'green'
    })
  } catch (err: any) {
    indMigrationError.value = err.data?.message || err.message || 'Terjadi kesalahan saat migrasi.'
    useToast().add({
      title: 'Kesalahan',
      description: indMigrationError.value,
      color: 'red'
    })
  } finally {
    isIndMigrationLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Sinkronisasi & Migrasi Data</h1>
        <p class="text-base-content/60">Kelola sinkronisasi data eksternal dan migrasi database lama.</p>
      </div>
    </div>

    <!-- Section 1: Sinkronisasi Karyawan (Existing) -->
    <div class="card bg-base-100 shadow-xl max-w-3xl">
      <div class="card-header px-6 py-4 border-b">
         <h2 class="card-title flex items-center gap-2">
            <RefreshCw class="w-5 h-5 text-primary" />
            Sinkronisasi Data Karyawan (HRS)
         </h2>
      </div>
      <div class="card-body">
        <p class="text-sm text-gray-500 mb-4">Sinkronkan Site, Divisi, Unit, dan Karyawan dari HRS eksternal.</p>
        <form @submit.prevent="handleEmployeeSync" class="space-y-4">
          <div class="grid grid-cols-1 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">URL Endpoint Sinkronisasi</span></label>
              <input v-model="employeeFormData.url" type="url" placeholder="https://api.example.com/sync" class="input input-bordered w-full" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Kunci API</span></label>
              <input v-model="employeeFormData.apiKey" type="text" placeholder="API Key" class="input input-bordered w-full font-mono" required />
            </div>
          </div>

          <div v-if="employeeSyncError" class="alert alert-error shadow-sm mt-3">
             <span>{{ employeeSyncError }}</span>
          </div>

          <div v-if="employeeSyncResult" class="alert alert-success shadow-sm mt-3">
            <div>
              <h3 class="font-bold">Sinkronisasi Selesai!</h3>
              <div class="text-xs mt-1">
                <p>{{ employeeSyncResult.message }}</p>
                <ul class="list-disc list-inside">
                  <li>Processed: {{ employeeSyncResult.stats?.processed }}</li>
                  <li>Sites: {{ employeeSyncResult.stats?.sites }}</li>
                  <li>Divisions: {{ employeeSyncResult.stats?.divisions }}</li>
                  <li>Units: {{ employeeSyncResult.stats?.units }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="card-actions justify-end mt-4">
            <button type="submit" class="btn btn-primary" :disabled="isEmployeeSyncLoading">
              <span v-if="isEmployeeSyncLoading" class="loading loading-spinner"></span>
              {{ isEmployeeSyncLoading ? 'Sinkronisasi...' : 'Mulai Sinkronisasi Employees' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Section 2: Migrasi Indikator (New) -->
    <div class="card bg-base-100 shadow-xl max-w-3xl border border-primary/20">
      <div class="card-header px-6 py-4 border-b bg-base-200/50">
         <h2 class="card-title flex items-center gap-2">
            <Database class="w-5 h-5 text-secondary" />
            Migrasi Data Indikator (MySQL Lama)
         </h2>
      </div>
      <div class="card-body">
        <p class="text-sm text-gray-500 mb-4">
            Migrasi data indikator dari database MySQL legacy ke database PostgreSQL saat ini. 
            Proses ini akan membaca tabel <code>tb_indikator</code> dan melakukan upsert ke tabel <code>indicators</code>.
        </p>
        
        <form @submit.prevent="handleIndicatorMigration" class="space-y-4">
            
            <div class="bg-base-200 p-4 rounded-lg mb-4">
                <div class="form-control font-bold">
                    <label class="label"><span class="label-text font-bold">Pilih Site Tujuan</span></label>
                    <select v-model="indicatorFormData.siteId" class="select select-bordered w-full" required>
                        <option disabled value="">-- Pilih Site --</option>
                        <option v-for="site in sites" :key="site.id" :value="site.id">
                            {{ site.name }} ({{ site.siteCode }})
                        </option>
                    </select>
                     <label class="label">
                        <span class="label-text-alt text-base-content/60">Indikator akan didaftarkan di bawah kategori "Migrasi" untuk site ini.</span>
                    </label>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                    <label class="label"><span class="label-text">MySQL Host</span></label>
                    <input v-model="indicatorFormData.host" type="text" placeholder="localhost" class="input input-bordered w-full" required />
                </div>
                <!-- Default 3066 as per user request -->
                <div class="form-control">
                    <label class="label"><span class="label-text">MySQL Port</span></label>
                    <input v-model="indicatorFormData.port" type="number" placeholder="3306" class="input input-bordered w-full" required />
                </div>
                <div class="form-control">
                    <label class="label"><span class="label-text">MySQL User</span></label>
                    <input v-model="indicatorFormData.user" type="text" placeholder="root" class="input input-bordered w-full" required />
                </div>
                <div class="form-control">
                    <label class="label"><span class="label-text">MySQL Password</span></label>
                    <input v-model="indicatorFormData.password" type="password" placeholder="" class="input input-bordered w-full" />
                </div>
                <div class="form-control md:col-span-2">
                    <label class="label"><span class="label-text">MySQL Database Name</span></label>
                    <input v-model="indicatorFormData.database" type="text" placeholder="Nama Database Lama (contoh: simutu_old)" class="input input-bordered w-full" required />
                    <label class="label">
                        <span class="label-text-alt text-warning">Pastikan database ini bisa diakses dari server aplikasi.</span>
                    </label>
                </div>
            </div>

            <div v-if="indMigrationError" class="alert alert-error shadow-sm mt-3">
                <span>{{ indMigrationError }}</span>
            </div>

            <div v-if="indMigrationResult" class="alert alert-success shadow-sm mt-3">
                <div>
                    <h3 class="font-bold">Migrasi Berhasil!</h3>
                    <div class="text-sm mt-1">
                        <p>{{ indMigrationResult.message }}</p>
                        <ul class="list-disc list-inside">
                            <li>Total Sumber: {{ indMigrationResult.stats?.totalFromSource }}</li>
                            <li>Data Baru (Inserted): {{ indMigrationResult.stats?.inserted }}</li>
                            <li>Data Update (Updated): {{ indMigrationResult.stats?.updated }}</li>
                            <li>Kategori Sinkron: {{ indMigrationResult.stats?.categoriesSynced }}</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="card-actions justify-end mt-4 gap-2">
                 <button type="button" class="btn btn-ghost border-base-300" @click="handleTestConnection" :disabled="isTestingConnection">
                    <span v-if="isTestingConnection" class="loading loading-spinner loading-xs"></span>
                    Test Connection
                </button>
                <button type="submit" class="btn btn-secondary" :disabled="isIndMigrationLoading">
                    <span v-if="isIndMigrationLoading" class="loading loading-spinner"></span>
                    <ArrowRightLeft v-else class="w-4 h-4 mr-2" />
                    {{ isIndMigrationLoading ? 'Sedang Migrasi...' : 'Jalankan Migrasi' }}
                </button>
            </div>
        </form>
      </div>
    </div>

  </div>
</template>
