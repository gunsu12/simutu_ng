<script setup lang="ts">
import { 
  Search, Plus, Edit, Trash2, Eye, RefreshCw, 
  CheckCircle, XCircle, AlertCircle, Info, ShieldAlert, 
  Save, X, Shield, AlertTriangle, Download
} from 'lucide-vue-next'

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
  createdBy: string
  creatorName: string
  approvedBy?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  rejectedNotes?: string | null
  createdAt: string
  updatedAt: string
}

const { user } = useAuth()
const { add: addToast } = useToast()

const isAdmin = computed(() => user.value?.role === 'admin')
const isAuditor = computed(() => user.value?.role === 'auditor')
const isReviewer = computed(() => isAdmin.value || isAuditor.value)

// Year options for filtering and form selection
const currentYear = new Date().getFullYear()
const yearsList = computed(() => {
  const years = []
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    years.push(y)
  }
  return years
})

// Navigation & Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
const filterSearch = ref('')
const filterStatus = ref('')
const filterUnitId = ref('')
const filterTahun = ref(currentYear) // default to current year

// Form & UI States
const showModal = ref(false)
const showDetailModal = ref(false)
const showRejectModal = ref(false)
const isEditing = ref(false)
const currentRisk = ref<RiskRegister | null>(null)
const selectedRiskId = ref('')
const saving = ref(false)
const errorMessage = ref('')

// Rejection state
const rejectionReason = ref('')
const processLoading = ref(false)

// Risk Categories
const riskCategories = [
  'Operasional Klinis',
  'Operasional Non Klinis',
  'Fasilitas',
  'Keselamatan dan Keamanan',
  'Infeksi',
  'K3RS Staf',
  'Lainnya'
]

// Form data initialized
const form = ref({
  tahun: currentYear,
  kategoriRisiko: '',
  risiko: '',
  penyebab: '',
  dampak: '',
  likelihood: 3,
  severity: 3,
  mitigasi: '',
  unitId: '',
})

// Calculate live total score for the form
const liveRiskRating = computed(() => {
  return Number(form.value.likelihood) * Number(form.value.severity)
})

const liveLevelRisiko = computed(() => {
  const rating = liveRiskRating.value
  if (rating >= 15) return 'Tinggi'
  if (rating >= 6) return 'Sedang'
  return 'Rendah'
})

// Fetch units
const { data: unitsData } = useLazyFetch<{
  success: boolean
  data: Unit[]
}>('/api/units', {
  default: () => ({ success: false, data: [] })
})
const unitsList = computed(() => unitsData.value?.data || [])

// Fetch Risk Registers Data
const { data: risksData, pending: loadingRisks, refresh: refreshRisks } = useLazyFetch<{
  success: boolean
  data: RiskRegister[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}>(() => {
  const params = new URLSearchParams()
  params.append('page', currentPage.value.toString())
  params.append('limit', pageSize.value.toString())
  if (filterSearch.value) params.append('search', filterSearch.value)
  if (filterStatus.value) params.append('status', filterStatus.value)
  if (filterTahun.value) params.append('tahun', filterTahun.value.toString())
  if (isReviewer.value && filterUnitId.value) params.append('unitId', filterUnitId.value)

  return `/api/risk-registers?${params.toString()}`
}, {
  default: () => ({ success: false, data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } }),
  watch: [currentPage, pageSize, filterSearch, filterStatus, filterUnitId, filterTahun]
})

const risks = computed(() => risksData.value?.data || [])
const meta = computed(() => risksData.value?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 })

// Search trigger
watch(searchQuery, (newVal) => {
  const handler = setTimeout(() => {
    filterSearch.value = newVal
    currentPage.value = 1
  }, 400)
  return () => clearTimeout(handler)
})

// UI resets & modal handlers
const resetForm = () => {
  form.value = {
    tahun: currentYear,
    kategoriRisiko: '',
    risiko: '',
    penyebab: '',
    dampak: '',
    likelihood: 3,
    severity: 3,
    mitigasi: '',
    unitId: isAdmin.value ? '' : (user.value?.unitId || ''),
  }
  errorMessage.value = ''
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (risk: RiskRegister) => {
  isEditing.value = true
  selectedRiskId.value = risk.id
  form.value = {
    tahun: risk.tahun,
    kategoriRisiko: risk.kategoriRisiko,
    risiko: risk.risiko,
    penyebab: risk.penyebab,
    dampak: risk.dampak,
    likelihood: risk.likelihood,
    severity: risk.severity,
    mitigasi: risk.mitigasi,
    unitId: risk.unitId,
  }
  showModal.value = true
}

const saveRisk = async () => {
  try {
    saving.value = true
    errorMessage.value = ''

    const url = isEditing.value 
      ? `/api/risk-registers/${selectedRiskId.value}` 
      : '/api/risk-registers'
    const method = isEditing.value ? 'PUT' : 'POST'

    const response = await $fetch<{ success: boolean; message?: string }>(url, {
      method,
      body: form.value
    })

    if (response.success) {
      await refreshRisks()
      showModal.value = false
      resetForm()
      addToast({
        title: 'Berhasil',
        description: response.message || 'Risk register berhasil disimpan',
        color: 'green'
      })
    } else {
      errorMessage.value = response.message || 'Gagal menyimpan usulan'
    }
  } catch (err: any) {
    console.error('Error saving risk register:', err)
    errorMessage.value = err.data?.message || 'Terjadi kesalahan sistem'
  } finally {
    saving.value = false
  }
}

const openDetailModal = async (risk: RiskRegister) => {
  try {
    const response = await $fetch<{ success: boolean; data: RiskRegister }>(`/api/risk-registers/${risk.id}`)
    if (response.success) {
      currentRisk.value = response.data
      showDetailModal.value = true
    }
  } catch (error) {
    console.error('Error loading detail:', error)
    addToast({
      title: 'Error',
      description: 'Gagal mengambil detail risk register',
      color: 'red'
    })
  }
}

const deleteRisk = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus risk register ini?')) return
  try {
    const response = await $fetch<{ success: boolean; message?: string }>(`/api/risk-registers/${id}`, {
      method: 'DELETE'
    })
    if (response.success) {
      await refreshRisks()
      addToast({
        title: 'Berhasil',
        description: response.message || 'Risk register berhasil dihapus',
        color: 'green'
      })
    }
  } catch (error: any) {
    addToast({
      title: 'Gagal',
      description: error.data?.message || 'Gagal menghapus risk register',
      color: 'red'
    })
  }
}

// Export Excel Function
const exportExcel = () => {
  const params = new URLSearchParams()
  if (filterSearch.value) params.append('search', filterSearch.value)
  if (filterStatus.value) params.append('status', filterStatus.value)
  if (filterTahun.value) params.append('tahun', filterTahun.value.toString())
  if (isReviewer.value && filterUnitId.value) params.append('unitId', filterUnitId.value)

  window.open(`/api/risk-registers/export?${params.toString()}`, '_blank')
}

// Approve / Reject actions
const confirmApprove = async () => {
  if (!currentRisk.value) return
  if (!confirm('Apakah Anda yakin ingin menyetujui usulan risk register ini?')) return

  try {
    processLoading.value = true
    const response = await $fetch<{ success: boolean; message?: string }>(`/api/risk-registers/${currentRisk.value.id}/approve`, {
      method: 'POST'
    })
    if (response.success) {
      showDetailModal.value = false
      await refreshRisks()
      addToast({
        title: 'Disetujui',
        description: 'Usulan risk register berhasil disetujui!',
        color: 'green'
      })
    } else {
      addToast({
        title: 'Gagal',
        description: response.message || 'Gagal menyetujui usulan',
        color: 'red'
      })
    }
  } catch (err: any) {
    addToast({
      title: 'Error',
      description: err.data?.message || 'Terjadi kesalahan sistem',
      color: 'red'
    })
  } finally {
    processLoading.value = false
  }
}

const openReject = () => {
  rejectionReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!currentRisk.value) return
  if (!rejectionReason.value.trim()) {
    alert('Alasan penolakan harus diisi')
    return
  }

  try {
    processLoading.value = true
    const response = await $fetch<{ success: boolean; message?: string }>(`/api/risk-registers/${currentRisk.value.id}/reject`, {
      method: 'POST',
      body: { notes: rejectionReason.value }
    })
    if (response.success) {
      showRejectModal.value = false
      showDetailModal.value = false
      await refreshRisks()
      addToast({
        title: 'Ditolak',
        description: 'Usulan risk register telah ditolak',
        color: 'yellow'
      })
    } else {
      alert(response.message || 'Gagal menolak usulan')
    }
  } catch (err: any) {
    alert(err.data?.message || 'Terjadi kesalahan')
  } finally {
    processLoading.value = false
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'approved': return 'badge-success text-white'
    case 'rejected': return 'badge-error text-white'
    default: return 'badge-warning text-white'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    default: return 'Diajukan'
  }
}

const getLevelClass = (level: string) => {
  switch (level) {
    case 'Tinggi': return 'badge-error text-white'
    case 'Sedang': return 'badge-warning text-white'
    default: return 'badge-success text-white'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
          <Shield class="w-7 h-7 text-primary" />
          Risk Register Rumah Sakit
        </h1>
        <p class="text-sm text-base-content/60 mt-1">
          Perencanaan, identifikasi, penilaian, mitigasi, dan persetujuan risiko unit pelayanan rumah sakit.
        </p>
      </div>
      
      <div class="flex flex-wrap gap-2">
        <button 
          @click="exportExcel" 
          class="btn btn-outline btn-success gap-2"
          :disabled="risks.length === 0"
        >
          <Download class="w-4 h-4" />
          Export Excel
        </button>
        <button 
          @click="openCreateModal" 
          class="btn btn-primary gap-2"
        >
          <Plus class="w-4 h-4" />
          Tambah Risk Register
        </button>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm">
      <div class="form-control sm:col-span-2 md:col-span-1 lg:col-span-2">
        <div class="relative">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search class="h-4 w-4 text-base-content/40" />
          </span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Cari risiko, penyebab, dampak, mitigasi..." 
            class="input input-bordered w-full pl-9 focus:outline-none" 
          />
        </div>
      </div>

      <div class="form-control">
        <select v-model="filterTahun" class="select select-bordered w-full focus:outline-none">
          <option value="">Semua Tahun</option>
          <option v-for="y in yearsList" :key="y" :value="y">Tahun {{ y }}</option>
        </select>
      </div>

      <div class="form-control">
        <select v-model="filterStatus" class="select select-bordered w-full focus:outline-none">
          <option value="">Semua Status</option>
          <option value="proposed">Diajukan</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      <div v-if="isReviewer" class="form-control">
        <select v-model="filterUnitId" class="select select-bordered w-full focus:outline-none">
          <option value="">Semua Unit</option>
          <option v-for="unit in unitsList" :key="unit.id" :value="unit.id">
            {{ unit.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Main List/Table -->
    <div class="bg-base-100 rounded-2xl border border-base-200 overflow-hidden shadow-sm">
      <div v-if="loadingRisks" class="p-12 flex flex-col justify-center items-center gap-3">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-sm text-base-content/60">Memuat data risk register...</p>
      </div>

      <div v-else-if="risks.length === 0" class="p-12 text-center space-y-3">
        <div class="flex justify-center">
          <ShieldAlert class="w-12 h-12 text-base-content/30" />
        </div>
        <h3 class="font-bold text-lg text-base-content">Tidak Ada Data Risk Register</h3>
        <p class="text-sm text-base-content/50 max-w-sm mx-auto">
          Belum ada risiko yang direncanakan untuk tahun/filter yang dipilih. Klik tombol "Tambah Risk Register" untuk menambahkan usulan baru.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table table-md w-full">
          <thead>
            <tr class="bg-base-50 text-base-content/70">
              <th class="w-12 text-center">No</th>
              <th class="w-20 text-center">Tahun</th>
              <th v-if="isReviewer">Unit</th>
              <th>Kategori</th>
              <th>Risiko</th>
              <th class="text-center w-16">L</th>
              <th class="text-center w-16">S</th>
              <th class="text-center w-16">Rating</th>
              <th class="text-center w-24">Level</th>
              <th class="text-center w-24">Status</th>
              <th class="w-32 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-100">
            <tr v-for="(risk, index) in risks" :key="risk.id" class="hover:bg-base-50/40">
              <td class="text-center font-semibold text-base-content/60">
                {{ (currentPage - 1) * pageSize + index + 1 }}
              </td>
              <td class="text-center font-bold text-base-content/70">
                {{ risk.tahun }}
              </td>
              <td v-if="isReviewer" class="font-medium text-base-content/80">
                {{ risk.unitName }}
              </td>
              <td class="font-semibold text-base-content/70 text-xs">
                {{ risk.kategoriRisiko }}
              </td>
              <td class="max-w-xs truncate font-medium text-base-content">
                {{ risk.risiko }}
              </td>
              <td class="text-center font-bold">{{ risk.likelihood }}</td>
              <td class="text-center font-bold">{{ risk.severity }}</td>
              <td class="text-center font-extrabold text-primary">{{ risk.riskRating }}</td>
              <td class="text-center">
                <span :class="['badge badge-sm font-bold p-2.5', getLevelClass(risk.levelRisiko)]">
                  {{ risk.levelRisiko }}
                </span>
              </td>
              <td class="text-center">
                <span :class="['badge badge-sm font-bold p-2.5', getStatusClass(risk.status)]">
                  {{ getStatusLabel(risk.status) }}
                </span>
              </td>
              <td class="text-center">
                <div class="flex justify-center gap-1">
                  <button 
                    @click="openDetailModal(risk)" 
                    class="btn btn-square btn-ghost btn-xs text-primary"
                    title="Lihat Detail"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                  <button 
                    v-if="risk.status !== 'approved' || isReviewer"
                    @click="openEditModal(risk)" 
                    class="btn btn-square btn-ghost btn-xs text-secondary"
                    title="Edit"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button 
                    v-if="risk.status !== 'approved' || isReviewer"
                    @click="deleteRisk(risk.id)" 
                    class="btn btn-square btn-ghost btn-xs text-error"
                    title="Hapus"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="meta.totalPages > 1" class="p-4 border-t border-base-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-base-50">
        <p class="text-xs text-base-content/60 font-medium">
          Menampilkan {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, meta.total) }} dari {{ meta.total }} usulan.
        </p>
        <div class="join">
          <button 
            @click="currentPage = Math.max(1, currentPage - 1)" 
            class="join-item btn btn-sm btn-outline focus:outline-none" 
            :disabled="currentPage === 1"
          >
            Sebelumnya
          </button>
          <button class="join-item btn btn-sm btn-active focus:outline-none pointer-events-none">
            {{ currentPage }} / {{ meta.totalPages }}
          </button>
          <button 
            @click="currentPage = Math.min(meta.totalPages, currentPage + 1)" 
            class="join-item btn btn-sm btn-outline focus:outline-none" 
            :disabled="currentPage === meta.totalPages"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showModal }]" :open="showModal">
        <div class="modal-box max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl">
          <!-- Modal Header -->
          <div class="p-6 border-b border-base-200 flex justify-between items-center bg-base-100 shrink-0">
            <div>
              <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
                <Shield class="w-5 h-5 text-primary" />
                {{ isEditing ? 'Edit Usulan Risk Register' : 'Buat Usulan Risk Register Baru' }}
              </h3>
              <p class="text-xs text-base-content/50 mt-0.5">Lengkapi formulir analisis risiko pelayanan di bawah ini.</p>
            </div>
            <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="showModal = false">✕</button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <div v-if="errorMessage" class="alert alert-error text-xs flex gap-2">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Custom Unit Select for Admin -->
            <div v-if="isAdmin" class="form-control">
              <label class="label"><span class="label-text text-xs font-semibold">Unit Pelayanan</span></label>
              <select v-model="form.unitId" class="select select-bordered select-sm focus:outline-none w-full" required>
                <option value="">Pilih Unit...</option>
                <option v-for="unit in unitsList" :key="unit.id" :value="unit.id">{{ unit.name }}</option>
              </select>
            </div>

            <!-- Period & Category -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text text-xs font-semibold">Tahun Pelayanan</span></label>
                <select v-model="form.tahun" class="select select-bordered select-sm focus:outline-none w-full" required>
                  <option v-for="y in yearsList" :key="y" :value="y">Tahun {{ y }}</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text text-xs font-semibold">Kategori Risiko</span></label>
                <select v-model="form.kategoriRisiko" class="select select-bordered select-sm focus:outline-none w-full" required>
                  <option value="">Pilih Kategori...</option>
                  <option v-for="cat in riskCategories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text text-xs font-semibold">Risiko (Uraian Kejadian)</span></label>
              <textarea 
                v-model="form.risiko" 
                placeholder="Contoh: Kesalahan identifikasi pasien rawat jalan..." 
                class="textarea textarea-bordered text-sm focus:outline-none min-h-[80px]" 
                required
              ></textarea>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text text-xs font-semibold">Penyebab Risiko (Akar Masalah)</span></label>
              <textarea 
                v-model="form.penyebab" 
                placeholder="Contoh: Verifikasi kartu identitas tidak dilakukan karena antrean padat..." 
                class="textarea textarea-bordered text-sm focus:outline-none min-h-[80px]" 
                required
              ></textarea>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text text-xs font-semibold">Dampak Risiko</span></label>
              <textarea 
                v-model="form.dampak" 
                placeholder="Contoh: Salah pemberian obat atau terapi medis..." 
                class="textarea textarea-bordered text-sm focus:outline-none min-h-[80px]" 
                required
              ></textarea>
            </div>

            <!-- Likelihood & Severity Selector -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-base-50 p-4 rounded-xl border border-base-200">
              <div class="form-control">
                <label class="label">
                  <span class="label-text text-xs font-semibold">Likelihood (Frekuensi)</span>
                </label>
                <select v-model="form.likelihood" class="select select-bordered select-sm focus:outline-none">
                  <option :value="1">1 - Sangat Jarang (Sangat kecil kemungkinan)</option>
                  <option :value="2">2 - Jarang (Kecil kemungkinan terjadi)</option>
                  <option :value="3">3 - Sedang (Mungkin terjadi sewaktu-waktu)</option>
                  <option :value="4">4 - Sering (Kemungkinan besar terjadi)</option>
                  <option :value="5">5 - Sangat Sering (Hampir pasti terjadi)</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text text-xs font-semibold">Severity (Dampak Klinis/Fasilitas)</span>
                </label>
                <select v-model="form.severity" class="select select-bordered select-sm focus:outline-none">
                  <option :value="1">1 - Ringan (Tidak ada cedera/rugi minor)</option>
                  <option :value="2">2 - Sedang Minor (Cedera ringan, P3K)</option>
                  <option :value="3">3 - Sedang Mayor (Cedera medis sedang, rawat inap)</option>
                  <option :value="4">4 - Berat (Cedera serius, cacat permanen)</option>
                  <option :value="5">5 - Katastrofik/Fatal (Kematian pasien/staf)</option>
                </select>
              </div>

              <div class="sm:col-span-2 border-t border-base-200 pt-3 flex justify-between items-center text-sm">
                <div>
                  <span class="text-xs text-base-content/50 block font-medium">Risk Score (L × S)</span>
                  <span class="text-lg font-black text-primary">{{ liveRiskRating }} / 25</span>
                </div>
                <div class="text-right">
                  <span class="text-xs text-base-content/50 block font-medium">Level Risiko</span>
                  <span :class="['badge badge-md font-bold text-white py-2 px-3', getLevelClass(liveLevelRisiko)]">
                    {{ liveLevelRisiko }}
                  </span>
                </div>
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text text-xs font-semibold">Upaya Mitigasi (Pencegahan & Kontrol)</span></label>
              <textarea 
                v-model="form.mitigasi" 
                placeholder="Contoh: Pengetatan SOP gelang identitas, audit bulanan kepatuhan staf, training..." 
                class="textarea textarea-bordered text-sm focus:outline-none min-h-[90px]" 
                required
              ></textarea>
            </div>
          </div>

          <!-- Modal Action Footer -->
          <div class="p-6 border-t border-base-200 flex justify-between shrink-0 bg-base-50">
            <button type="button" @click="showModal = false" class="btn btn-ghost" :disabled="saving">Batal</button>
            <button 
              type="button" 
              @click="saveRisk" 
              class="btn btn-primary gap-2" 
              :disabled="saving || !form.kategoriRisiko || !form.risiko || !form.penyebab || !form.dampak || !form.mitigasi || (isAdmin && !form.unitId)"
            >
              <Save class="w-4 h-4" />
              {{ saving ? 'Menyimpan...' : 'Ajukan Usulan' }}
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" @click="showModal = false">tutup</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Detail Review Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showDetailModal }]" :open="showDetailModal">
        <div class="modal-box max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl">
          <!-- Header -->
          <div class="p-6 border-b border-base-200 flex justify-between items-center bg-base-100 shrink-0">
            <div>
              <h3 class="font-bold text-lg text-base-content flex items-center gap-1.5">
                <Shield class="w-5 h-5 text-primary" />
                Detail Usulan Risk Register
              </h3>
              <p class="text-xs text-base-content/50 mt-0.5">
                Diajukan oleh: <span class="font-bold">{{ currentRisk?.creatorName || '-' }}</span> | Unit: {{ currentRisk?.unitName }} | Tahun: {{ currentRisk?.tahun }}
              </p>
            </div>
            <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="showDetailModal = false">✕</button>
          </div>

          <!-- Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Rejection Reason Alert -->
            <div v-if="currentRisk?.status === 'rejected'" class="alert alert-error flex items-start gap-3 text-white rounded-xl shadow-md p-4">
              <ShieldAlert class="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p class="font-bold text-sm">Usulan Risk Register Ditolak</p>
                <p class="text-xs opacity-90 mt-0.5">Alasan: {{ currentRisk?.rejectedNotes }}</p>
              </div>
            </div>

            <!-- Approved Alert -->
            <div v-if="currentRisk?.status === 'approved'" class="alert alert-success flex items-start gap-3 text-white rounded-xl shadow-md p-4">
              <CheckCircle class="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p class="font-bold text-sm">Usulan Risk Register Disetujui</p>
                <p class="text-xs opacity-90 mt-0.5">
                  Telah diverifikasi dan dimasukkan ke dalam daftar Risk Register Resmi.
                </p>
              </div>
            </div>

            <!-- Key Risk Metrics -->
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="bg-base-50 p-4 rounded-xl border border-base-200 shadow-sm">
                <span class="text-xs text-base-content/50 font-bold block mb-1">Likelihood</span>
                <span class="text-2xl font-black text-base-content">{{ currentRisk?.likelihood }} / 5</span>
              </div>
              <div class="bg-base-50 p-4 rounded-xl border border-base-200 shadow-sm">
                <span class="text-xs text-base-content/50 font-bold block mb-1">Severity</span>
                <span class="text-2xl font-black text-base-content">{{ currentRisk?.severity }} / 5</span>
              </div>
              <div class="bg-base-50 p-4 rounded-xl border border-base-200 shadow-sm">
                <span class="text-xs text-base-content/50 font-bold block mb-1">Risk Rating</span>
                <span class="text-2xl font-black text-primary">{{ currentRisk?.riskRating }} / 25</span>
              </div>
            </div>

            <!-- Main Detailed Info Table -->
            <div class="border border-base-200 rounded-xl overflow-hidden shadow-sm bg-base-100 divide-y divide-base-100">
              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm bg-base-50/20">
                <div class="font-bold text-base-content/60">Tahun Anggaran</div>
                <div class="md:col-span-3 font-semibold text-base-content">Tahun {{ currentRisk?.tahun }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm bg-base-50/10">
                <div class="font-bold text-base-content/60">Kategori Risiko</div>
                <div class="md:col-span-3 font-semibold text-base-content">{{ currentRisk?.kategoriRisiko }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm">
                <div class="font-bold text-base-content/60">Deskripsi Risiko</div>
                <div class="md:col-span-3 font-medium text-base-content whitespace-pre-wrap">{{ currentRisk?.risiko }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm">
                <div class="font-bold text-base-content/60">Penyebab</div>
                <div class="md:col-span-3 text-base-content whitespace-pre-wrap">{{ currentRisk?.penyebab }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm">
                <div class="font-bold text-base-content/60">Dampak</div>
                <div class="md:col-span-3 text-base-content whitespace-pre-wrap">{{ currentRisk?.dampak }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm">
                <div class="font-bold text-base-content/60">Upaya Mitigasi</div>
                <div class="md:col-span-3 font-semibold text-success whitespace-pre-wrap">{{ currentRisk?.mitigasi }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm">
                <div class="font-bold text-base-content/60">Level Risiko</div>
                <div class="md:col-span-3">
                  <span :class="['badge badge-sm font-bold text-white py-2 px-3', getLevelClass(currentRisk?.levelRisiko || '')]">
                    {{ currentRisk?.levelRisiko }}
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 p-4 gap-1 md:gap-4 text-sm bg-base-50/5">
                <div class="font-bold text-base-content/60">Tanggal Pengajuan</div>
                <div class="md:col-span-3 font-medium text-base-content/70">
                  {{ currentRisk ? new Date(currentRisk.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Review Actions (Only for Admin/Auditor in proposed status) -->
          <div 
            v-if="isReviewer && currentRisk?.status === 'proposed'" 
            class="p-6 border-t border-base-200 flex justify-end gap-3 shrink-0 bg-base-50"
          >
            <button 
              type="button" 
              @click="openReject" 
              class="btn btn-error text-white gap-2"
              :disabled="processLoading"
            >
              <XCircle class="w-4 h-4" />
              Tolak Usulan
            </button>
            <button 
              type="button" 
              @click="confirmApprove" 
              class="btn btn-success text-white gap-2"
              :disabled="processLoading"
            >
              <CheckCircle class="w-4 h-4" />
              Setujui Usulan
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" @click="showDetailModal = false">tutup</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Rejection Notes Input Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showRejectModal }]" :open="showRejectModal" style="z-index: 11000">
        <div class="modal-box max-w-sm rounded-2xl shadow-xl border border-base-200">
          <h3 class="font-bold text-lg text-base-content">Tolak Usulan Risk Register</h3>
          <p class="text-xs text-base-content/50 mt-1">Berikan alasan mengapa usulan ini ditolak agar unit dapat merevisi.</p>
          
          <div class="form-control mt-4">
            <textarea 
              v-model="rejectionReason" 
              placeholder="Masukkan alasan penolakan..." 
              class="textarea textarea-bordered text-sm w-full focus:outline-none min-h-[90px]"
              required
            ></textarea>
          </div>

          <div class="modal-action flex justify-between">
            <button type="button" @click="showRejectModal = false" class="btn btn-sm btn-ghost" :disabled="processLoading">Batal</button>
            <button 
              type="button" 
              @click="confirmReject" 
              class="btn btn-sm btn-error text-white gap-2"
              :disabled="processLoading || !rejectionReason.trim()"
            >
              Kirim Penolakan
            </button>
          </div>
        </div>
      </dialog>
    </Teleport>
  </div>
</template>
