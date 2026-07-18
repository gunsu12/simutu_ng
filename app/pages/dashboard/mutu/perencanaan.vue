<script setup lang="ts">
import { 
  Search, Plus, Edit, Trash2, Eye, ClipboardList, RefreshCw, 
  CheckCircle, XCircle, AlertCircle, Info, ShieldAlert, Award, 
  ArrowRight, Save, X, Settings, Users
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface IndicatorCategory {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
  unitCode: string
}

interface IndicatorPlan {
  id: string
  siteId: string
  unitId: string
  unitName: string
  indicatorCategoryId: string
  categoryName: string
  judul: string
  status: 'proposed' | 'approved' | 'rejected'
  k1: number
  k2: number
  k3: number
  k4: number
  k5: number
  k6: number
  k7: number
  k8: number
  totalScore: number
  dasarPemikiran: string | null
  dimensiMutu: string | null
  tujuan: string | null
  definisiOperasional: string | null
  jenisIndikator: string | null
  satuanPengukuran: string | null
  numerator: string | null
  denominator: string | null
  formula: string | null
  target: number | null
  targetUnit: string | null
  targetKeterangan: string | null
  targetIsZero: boolean
  targetCalculationFormula: string | null
  kriteriaInklusi: string | null
  kriteriaEksklusi: string | null
  metodePengumpulanData: string | null
  sumberData: string | null
  instrumenPengambilanData: string | null
  besarSampel: string | null
  caraPengambilanSampel: string | null
  periodePengumpulanData: string | null
  penyajianData: string | null
  periodeAnalisisDanPelaporanData: string | null
  penanggungJawab: string | null
  creatorName: string
  createdBy: string
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedNotes?: string | null
  indicatorId?: string | null
  createdAt: string
}

const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')
const isAuditor = computed(() => user.value?.role === 'auditor')
const isReviewer = computed(() => isAdmin.value || isAuditor.value)

// Navigation & Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
const filterSearch = ref('')
const filterStatus = ref('')
const filterUnitId = ref('')

// Form & UI States
const showModal = ref(false)
const showDetailModal = ref(false)
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const isEditing = ref(false)
const currentTab = ref('scoring') // 'scoring' or 'profile'
const currentPlan = ref<IndicatorPlan | null>(null)
const selectedPlanId = ref('')
const saving = ref(false)
const errorMessage = ref('')

// Approval/Rejection states
const newIndicatorCode = ref('')
const rejectionReason = ref('')
const processLoading = ref(false)

// Kriteria Prioritas labels & descriptions
const criteria = [
  { id: 'k1', key: 'k1', name: 'Problem Prone / Bad Performance', desc: 'Kinerja buruk / cenderung bermasalah berdasarkan data historis.' },
  { id: 'k2', key: 'k2', name: 'High Volume', desc: 'Volume pelayanan / frekuensi tindakan tinggi dan sering dilakukan.' },
  { id: 'k3', key: 'k3', name: 'High Risk', desc: 'Risiko fatal bagi pasien/staf jika terjadi kesalahan tindakan.' },
  { id: 'k4', key: 'k4', name: 'Ketidakpuasan Staf & Pasien', desc: 'Sumber keluhan tertinggi dari staf maupun pasien.' },
  { id: 'k5', key: 'k5', name: 'Kemudahan Pengukuran', desc: 'Kelayakan/kemudahan pengumpulan data tanpa membebani staf.' },
  { id: 'k6', key: 'k6', name: 'Ketentuan Pemerintah', desc: 'Kewajiban regulasi/akreditasi (misal: Indikator Mutu Nasional).' },
  { id: 'k7', key: 'k7', name: 'Tujuan Strategis RS', desc: 'Keselarasan dengan target jangka panjang pemilik/manajemen.' },
  { id: 'k8', key: 'k8', name: 'Better Patient Experience', desc: 'Fokus peningkatan kepuasan & kenyamanan langsung pasien.' }
]

// Form data initialized
const form = ref({
  indicatorCategoryId: '',
  judul: '',
  k1: 3,
  k2: 3,
  k3: 3,
  k4: 3,
  k5: 3,
  k6: 3,
  k7: 3,
  k8: 3,
  dasarPemikiran: '',
  dimensiMutu: '',
  tujuan: '',
  definisiOperasional: '',
  jenisIndikator: '',
  satuanPengukuran: '',
  numerator: '',
  denominator: '',
  formula: '',
  target: null as number | null,
  targetUnit: '',
  targetKeterangan: '',
  targetIsZero: false,
  targetCalculationFormula: '',
  kriteriaInklusi: '',
  kriteriaEksklusi: '',
  metodePengumpulanData: '',
  sumberData: '',
  instrumenPengambilanData: '',
  besarSampel: '',
  caraPengambilanSampel: '',
  periodePengumpulanData: 'Bulanan',
  penyajianData: 'tabel dan grafik',
  periodeAnalisisDanPelaporanData: 'Bulanan',
  penanggungJawab: '',
  unitId: '',
})

// Calculate live total score for the form
const liveTotalScore = computed(() => {
  return Number(form.value.k1) + 
         Number(form.value.k2) + 
         Number(form.value.k3) + 
         Number(form.value.k4) + 
         Number(form.value.k5) + 
         Number(form.value.k6) + 
         Number(form.value.k7) + 
         Number(form.value.k8)
})

// Fetch units
const { data: unitsData } = useLazyFetch<{
  success: boolean
  data: Unit[]
}>('/api/units', {
  default: () => ({ success: false, data: [] })
})
const unitsList = computed(() => unitsData.value?.data || [])

// Fetch Categories
const { data: categoriesData } = useLazyFetch<{
  success: boolean
  data: IndicatorCategory[]
}>('/api/indicator-categories', {
  default: () => ({ success: false, data: [] })
})
const categoriesList = computed(() => categoriesData.value?.data || [])

// Fetch Plans Data
const { data: plansData, pending: loadingPlans, refresh: refreshPlans } = useLazyFetch<{
  success: boolean
  data: IndicatorPlan[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}>(() => {
  const params = new URLSearchParams()
  params.append('page', currentPage.value.toString())
  params.append('limit', pageSize.value.toString())
  if (filterSearch.value) params.append('search', filterSearch.value)
  if (filterStatus.value) params.append('status', filterStatus.value)
  if (isAdmin.value && filterUnitId.value) params.append('unitId', filterUnitId.value)

  return `/api/indicator-plans?${params.toString()}`
}, {
  default: () => ({ success: false, data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } }),
  watch: [currentPage, pageSize, filterSearch, filterStatus, filterUnitId]
})

const plans = computed(() => plansData.value?.data || [])
const meta = computed(() => plansData.value?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 })

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
    indicatorCategoryId: '',
    judul: '',
    k1: 3,
    k2: 3,
    k3: 3,
    k4: 3,
    k5: 3,
    k6: 3,
    k7: 3,
    k8: 3,
    dasarPemikiran: '',
    dimensiMutu: '',
    tujuan: '',
    definisiOperasional: '',
    jenisIndikator: '',
    satuanPengukuran: '',
    numerator: '',
    denominator: '',
    formula: '',
    target: null,
    targetUnit: '',
    targetKeterangan: '',
    targetIsZero: false,
    targetCalculationFormula: '',
    kriteriaInklusi: '',
    kriteriaEksklusi: '',
    metodePengumpulanData: '',
    sumberData: '',
    instrumenPengambilanData: '',
    besarSampel: '',
    caraPengambilanSampel: '',
    periodePengumpulanData: 'Bulanan',
    penyajianData: 'tabel dan grafik',
    periodeAnalisisDanPelaporanData: 'Bulanan',
    penanggungJawab: '',
    unitId: '',
  }
  errorMessage.value = ''
  currentTab.value = 'scoring'
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (plan: IndicatorPlan) => {
  isEditing.value = true
  selectedPlanId.value = plan.id
  form.value = {
    indicatorCategoryId: plan.indicatorCategoryId,
    judul: plan.judul,
    k1: plan.k1,
    k2: plan.k2,
    k3: plan.k3,
    k4: plan.k4,
    k5: plan.k5,
    k6: plan.k6,
    k7: plan.k7,
    k8: plan.k8,
    dasarPemikiran: plan.dasarPemikiran || '',
    dimensiMutu: plan.dimensiMutu || '',
    tujuan: plan.tujuan || '',
    definisiOperasional: plan.definisiOperasional || '',
    jenisIndikator: plan.jenisIndikator || '',
    satuanPengukuran: plan.satuanPengukuran || '',
    numerator: plan.numerator || '',
    denominator: plan.denominator || '',
    formula: plan.formula || '',
    target: plan.target,
    targetUnit: plan.targetUnit || '',
    targetKeterangan: plan.targetKeterangan || '',
    targetIsZero: plan.targetIsZero,
    targetCalculationFormula: plan.targetCalculationFormula || '',
    kriteriaInklusi: plan.kriteriaInklusi || '',
    kriteriaEksklusi: plan.kriteriaEksklusi || '',
    metodePengumpulanData: plan.metodePengumpulanData || '',
    sumberData: plan.sumberData || '',
    instrumenPengambilanData: plan.instrumenPengambilanData || '',
    besarSampel: plan.besarSampel || '',
    caraPengambilanSampel: plan.caraPengambilanSampel || '',
    periodePengumpulanData: plan.periodePengumpulanData || 'Bulanan',
    penyajianData: plan.penyajianData || 'tabel dan grafik',
    periodeAnalisisDanPelaporanData: plan.periodeAnalisisDanPelaporanData || 'Bulanan',
    penanggungJawab: plan.penanggungJawab || '',
    unitId: plan.unitId,
  }
  showModal.value = true
}

const savePlan = async () => {
  try {
    saving.value = true
    errorMessage.value = ''

    const url = isEditing.value 
      ? `/api/indicator-plans/${selectedPlanId.value}` 
      : '/api/indicator-plans'
    const method = isEditing.value ? 'PUT' : 'POST'

    const response = await $fetch<{ success: boolean; message?: string }>(url, {
      method,
      body: form.value
    })

    if (response.success) {
      await refreshPlans()
      showModal.value = false
      resetForm()
    } else {
      errorMessage.value = response.message || 'Gagal menyimpan usulan'
    }
  } catch (err: any) {
    console.error('Error saving plan:', err)
    errorMessage.value = err.data?.message || 'Terjadi kesalahan sistem'
  } finally {
    saving.value = false
  }
}

const openDetailModal = async (plan: IndicatorPlan) => {
  try {
    const response = await $fetch<{ success: boolean; data: IndicatorPlan }>(`/api/indicator-plans/${plan.id}`)
    if (response.success) {
      currentPlan.value = response.data
      showDetailModal.value = true
    }
  } catch (error) {
    console.error('Error loading detail:', error)
    alert('Gagal mengambil detail usulan')
  }
}

const deletePlan = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus usulan perencanaan ini?')) return
  try {
    const response = await $fetch<{ success: boolean }>(`/api/indicator-plans/${id}`, {
      method: 'DELETE'
    })
    if (response.success) {
      await refreshPlans()
    }
  } catch (error: any) {
    alert(error.data?.message || 'Gagal menghapus usulan')
  }
}

// Approve / Reject actions
const openApprove = () => {
  newIndicatorCode.value = ''
  showApproveModal.value = true
}

const confirmApprove = async () => {
  if (!newIndicatorCode.value.trim()) {
    alert('Kode Indikator harus diisi')
    return
  }
  try {
    processLoading.value = true
    const response = await $fetch<{ success: boolean; message?: string }>(`/api/indicator-plans/${currentPlan.value?.id}/approve`, {
      method: 'POST',
      body: { code: newIndicatorCode.value }
    })
    if (response.success) {
      showApproveModal.value = false
      showDetailModal.value = false
      await refreshPlans()
      alert('Usulan berhasil disetujui dan dimasukkan ke master indikator!')
    } else {
      alert(response.message || 'Gagal menyetujui usulan')
    }
  } catch (err: any) {
    alert(err.data?.message || 'Terjadi kesalahan')
  } finally {
    processLoading.value = false
  }
}

const openReject = () => {
  rejectionReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!rejectionReason.value.trim()) {
    alert('Alasan penolakan harus diisi')
    return
  }
  try {
    processLoading.value = true
    const response = await $fetch<{ success: boolean; message?: string }>(`/api/indicator-plans/${currentPlan.value?.id}/reject`, {
      method: 'POST',
      body: { rejectedNotes: rejectionReason.value }
    })
    if (response.success) {
      showRejectModal.value = false
      showDetailModal.value = false
      await refreshPlans()
      alert('Usulan berhasil ditolak!')
    } else {
      alert(response.message || 'Gagal menolak usulan')
    }
  } catch (err: any) {
    alert(err.data?.message || 'Terjadi kesalahan')
  } finally {
    processLoading.value = false
  }
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'approved': return 'badge-success text-success-content'
    case 'rejected': return 'badge-error text-error-content'
    default: return 'badge-warning text-warning-content'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    default: return 'Menunggu Persetujuan'
  }
}

const getScoreColorClass = (score: number) => {
  if (score >= 28) return 'text-success font-bold'
  if (score >= 20) return 'text-warning font-bold'
  return 'text-base-content/70'
}

const formatTarget = (p: IndicatorPlan | null) => {
  if (!p || p.target === null || p.target === undefined) return '-'
  const unit = p.targetUnit === 'percentage' ? '%' : p.targetUnit === 'day' ? ' hari' : ''
  const comparison = p.targetKeterangan || ''
  return `${comparison} ${p.target}${unit}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Perencanaan Indikator Mutu</h1>
        <p class="text-base-content/60 mt-1">Kelola usulan pemilihan indikator prioritas dan profil kamus indikator mutu unit kerja</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshPlans()" class="btn btn-ghost btn-sm gap-2" :disabled="loadingPlans">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loadingPlans }" />
          Segarkan
        </button>
        <button type="button" @click="openCreateModal" class="btn btn-primary gap-2">
          <Plus class="w-4 h-4" />
          Usulkan Indikator Baru
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-4 flex flex-row items-center gap-4">
          <div class="p-3 bg-primary/10 text-primary rounded-xl">
            <ClipboardList class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-base-content/60 font-medium uppercase tracking-wider">Total Usulan</p>
            <p class="text-2xl font-bold text-base-content">{{ plans.length }}</p>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-4 flex flex-row items-center gap-4">
          <div class="p-3 bg-warning/10 text-warning rounded-xl">
            <AlertCircle class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-base-content/60 font-medium uppercase tracking-wider">Menunggu</p>
            <p class="text-2xl font-bold text-base-content">{{ plans.filter(p => p.status === 'proposed').length }}</p>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-4 flex flex-row items-center gap-4">
          <div class="p-3 bg-success/10 text-success rounded-xl">
            <CheckCircle class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-base-content/60 font-medium uppercase tracking-wider">Disetujui</p>
            <p class="text-2xl font-bold text-base-content">{{ plans.filter(p => p.status === 'approved').length }}</p>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-4 flex flex-row items-center gap-4">
          <div class="p-3 bg-error/10 text-error rounded-xl">
            <XCircle class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-base-content/60 font-medium uppercase tracking-wider">Ditolak</p>
            <p class="text-2xl font-bold text-base-content">{{ plans.filter(p => p.status === 'rejected').length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search input -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari judul usulan..."
              class="input input-sm input-bordered w-full pl-10"
            />
          </div>
          <!-- Filter status -->
          <div>
            <select v-model="filterStatus" class="select select-sm select-bordered w-full">
              <option value="">Semua Status</option>
              <option value="proposed">Menunggu Persetujuan</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
          <!-- Filter unit (Admin only) -->
          <div v-if="isAdmin">
            <select v-model="filterUnitId" class="select select-sm select-bordered w-full">
              <option value="">Semua Unit Kerja</option>
              <option v-for="unit in unitsList" :key="unit.id" :value="unit.id">
                {{ unit.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Table List -->
    <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr class="bg-base-200/50">
              <th>Unit Kerja</th>
              <th>Kategori</th>
              <th>Judul Usulan Indikator</th>
              <th class="text-center">Total Skor</th>
              <th>Status</th>
              <th>Diajukan Pada</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingPlans">
              <td colspan="7" class="text-center py-8">
                <span class="loading loading-spinner loading-md text-primary"></span>
              </td>
            </tr>
            <tr v-else-if="plans.length === 0">
              <td colspan="7" class="text-center py-8 text-base-content/50 font-medium">
                Belum ada data usulan perencanaan indikator
              </td>
            </tr>
            <tr v-else v-for="plan in plans" :key="plan.id" class="hover:bg-base-200/20">
              <td class="font-semibold text-xs max-w-[150px] truncate">{{ plan.unitName }}</td>
              <td class="text-xs">{{ plan.categoryName }}</td>
              <td class="font-medium max-w-[250px] truncate" :title="plan.judul">{{ plan.judul }}</td>
              <td class="text-center">
                <span :class="['badge badge-md font-bold', getScoreColorClass(plan.totalScore)]">
                  {{ plan.totalScore }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm font-semibold', getStatusBadgeClass(plan.status)]">
                  {{ getStatusLabel(plan.status) }}
                </span>
              </td>
              <td class="text-xs text-base-content/60">
                {{ new Date(plan.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-1">
                  <button 
                    @click="openDetailModal(plan)" 
                    class="btn btn-ghost btn-xs text-primary" 
                    title="Lihat Detail & Review"
                  >
                    <Eye class="w-3.5 h-3.5" />
                    Review
                  </button>
                  <button 
                    v-if="plan.status !== 'approved' && (isAdmin || user.id === plan.createdBy)"
                    @click="openEditModal(plan)" 
                    class="btn btn-ghost btn-square btn-xs" 
                    title="Ubah"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>
                  <button 
                    v-if="plan.status !== 'approved' && (isAdmin || user.id === plan.createdBy)"
                    @click="deletePlan(plan.id)" 
                    class="btn btn-ghost btn-square btn-xs text-error" 
                    title="Hapus"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div v-if="meta.totalPages > 1" class="p-4 border-t border-base-200 flex justify-between items-center bg-base-50">
        <span class="text-xs text-base-content/50">Halaman {{ currentPage }} dari {{ meta.totalPages }}</span>
        <div class="join">
          <button class="btn btn-xs join-item" :disabled="currentPage === 1" @click="currentPage--">«</button>
          <button class="btn btn-xs join-item no-animation">Hal {{ currentPage }}</button>
          <button class="btn btn-xs join-item" :disabled="currentPage === meta.totalPages" @click="currentPage++">»</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showModal }]" :open="showModal">
        <div class="modal-box max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <!-- Modal Header -->
          <div class="p-6 border-b border-base-200 flex justify-between items-center shrink-0">
            <h3 class="font-bold text-xl text-base-content flex items-center gap-2">
              <ClipboardList class="w-5.5 h-5.5 text-primary" />
              {{ isEditing ? 'Ubah Usulan Indikator' : 'Usulkan Indikator Mutu Baru' }}
            </h3>
            <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="showModal = false">✕</button>
          </div>

          <!-- Tabs Navigation -->
          <div class="tabs tabs-boxed rounded-none border-b border-base-200 shrink-0 bg-base-100 px-6 py-2">
            <a 
              @click="currentTab = 'scoring'" 
              :class="['tab tab-md font-semibold gap-2 transition-all', currentTab === 'scoring' ? 'tab-active bg-primary text-primary-content' : '']"
            >
              1. Penilaian Kriteria Prioritas
              <span class="badge badge-sm" :class="currentTab === 'scoring' ? 'badge-ghost' : 'badge-primary'">Skor: {{ liveTotalScore }}</span>
            </a>
            <a 
              @click="currentTab = 'profile'" 
              :class="['tab tab-md font-semibold gap-2 transition-all', currentTab === 'profile' ? 'tab-active bg-primary text-primary-content' : '']"
            >
              2. Profil / Kamus Indikator
            </a>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mx-6 mt-4 alert alert-error shrink-0 py-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span class="text-xs font-semibold">{{ errorMessage }}</span>
          </div>

          <!-- Tab Content (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- TAB 1: SCORING -->
            <div v-show="currentTab === 'scoring'" class="space-y-6">
              <div class="bg-info/10 text-info border border-info/20 p-4 rounded-xl flex items-start gap-3">
                <Info class="w-5 h-5 shrink-0 mt-0.5" />
                <div class="text-xs">
                  <p class="font-semibold">Petunjuk Metode Penilaian Prioritas:</p>
                  <p class="mt-1">
                    Setiap usulan calon indikator dinilai berdasarkan 8 kriteria menggunakan skala **1 s.d. 5**.<br/>
                    - **Skor 1**: Sangat Rendah / Tidak Berisiko / Sangat Sulit / Tidak Diatur.<br/>
                    - **Skor 5**: Sangat Tinggi / Sangat Berisiko / Sangat Mudah / Wajib Regulasi.<br/>
                    Calon indikator yang menghasilkan **Total Skor Tertinggi** akan diprioritaskan menjadi Indikator Mutu Rumah Sakit.
                  </p>
                </div>
              </div>

              <!-- Basic Fields on Tab 1 -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Unit (Admin only) -->
                <div v-if="isAdmin" class="form-control">
                  <label class="label"><span class="label-text font-semibold text-xs">Unit Kerja <span class="text-error">*</span></span></label>
                  <select v-model="form.unitId" class="select select-bordered select-sm w-full" required>
                    <option value="">Pilih Unit Pengusul</option>
                    <option v-for="unit in unitsList" :key="unit.id" :value="unit.id">
                      {{ unit.name }}
                    </option>
                  </select>
                </div>
                <!-- Kategori -->
                <div class="form-control" :class="isAdmin ? 'md:col-span-1' : 'md:col-span-1'">
                  <label class="label"><span class="label-text font-semibold text-xs">Kategori Indikator <span class="text-error">*</span></span></label>
                  <select v-model="form.indicatorCategoryId" class="select select-bordered select-sm w-full" required>
                    <option value="">Pilih Kategori</option>
                    <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
                <!-- Judul -->
                <div class="form-control" :class="isAdmin ? 'md:col-span-1' : 'md:col-span-2'">
                  <label class="label"><span class="label-text font-semibold text-xs">Judul Calon Indikator <span class="text-error">*</span></span></label>
                  <input 
                    v-model="form.judul" 
                    type="text" 
                    placeholder="Contoh: Kepatuhan Identifikasi Pasien" 
                    class="input input-bordered input-sm w-full font-medium" 
                    required 
                  />
                </div>
              </div>

              <!-- Criteria sliders grid -->
              <div class="divider text-xs font-bold uppercase tracking-wider text-base-content/40">Kriteria Penilaian Prioritas (1-5)</div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div v-for="item in criteria" :key="item.id" class="card bg-base-50 p-4 border border-base-200 rounded-xl space-y-3">
                  <div class="flex justify-between items-start gap-4">
                    <div>
                      <h4 class="font-bold text-sm text-base-content">{{ item.name }}</h4>
                      <p class="text-xs text-base-content/60 mt-0.5">{{ item.desc }}</p>
                    </div>
                    <span class="badge badge-primary font-bold text-sm h-7 w-7 rounded-full shrink-0 flex items-center justify-center">
                      {{ (form as any)[item.key] }}
                    </span>
                  </div>
                  <div class="form-control w-full">
                    <select 
                      v-model.number="(form as any)[item.key]" 
                      class="select select-bordered select-sm w-full font-semibold"
                    >
                      <option :value="1">1 - Sangat Rendah</option>
                      <option :value="2">2 - Rendah</option>
                      <option :value="3">3 - Sedang</option>
                      <option :value="4">4 - Tinggi</option>
                      <option :value="5">5 - Sangat Tinggi</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Realtime total display -->
              <div class="bg-base-200/50 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h4 class="font-bold text-base-content">Total Skor Perencanaan</h4>
                  <p class="text-xs text-base-content/60 mt-0.5">Penjumlahan skor dari ke-8 kriteria prioritas di atas.</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold uppercase text-base-content/50">Total Skor:</span>
                  <span class="text-4xl font-extrabold text-primary">{{ liveTotalScore }}</span>
                  <span class="text-sm font-semibold text-base-content/50">/ 40</span>
                </div>
              </div>
            </div>

            <!-- TAB 2: PROFILE FORM -->
            <div v-show="currentTab === 'profile'" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Dasar Pemikiran</span></label>
                  <textarea v-model="form.dasarPemikiran" placeholder="Dasar pemilihan/dasar hukum/literatur..." class="textarea textarea-bordered h-20 text-sm"></textarea>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Definisi Operasional</span></label>
                  <textarea v-model="form.definisiOperasional" placeholder="Definisi batasan pengukuran indikator..." class="textarea textarea-bordered h-20 text-sm"></textarea>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Dimensi Mutu</span></label>
                  <input v-model="form.dimensiMutu" type="text" placeholder="Contoh: Keselamatan, Efektif, Tepat Waktu" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Jenis Indikator</span></label>
                  <select v-model="form.jenisIndikator" class="select select-bordered select-sm w-full">
                    <option value="">Pilih Jenis</option>
                    <option value="Input">Input</option>
                    <option value="Proses">Proses</option>
                    <option value="Output">Output</option>
                    <option value="Outcome">Outcome</option>
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Satuan Pengukuran</span></label>
                  <input v-model="form.satuanPengukuran" type="text" placeholder="Contoh: Persentase, Hari, Jumlah" class="input input-bordered input-sm" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Numerator (Pembilang)</span></label>
                  <input v-model="form.numerator" type="text" placeholder="Kondisi yang diukur" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Denominator (Penyebut)</span></label>
                  <input v-model="form.denominator" type="text" placeholder="Semua peluang/populasi" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Formula Perhitungan</span></label>
                  <select v-model="form.targetCalculationFormula" class="select select-bordered select-sm w-full">
                    <option value="">Pilih Formula</option>
                    <option value="N/D">N/D</option>
                    <option value="N-D">N-D</option>
                    <option value="(N/D)*100">(N/D)*100</option>
                  </select>
                </div>
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text text-xs font-semibold">Deskripsi Rumus/Formula</span></label>
                <textarea v-model="form.formula" placeholder="Penjelasan detail formula rumusan..." class="textarea textarea-bordered h-16 text-sm"></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-base-50 p-4 border border-base-200 rounded-xl">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-bold">Target</span></label>
                  <input v-model.number="form.target" type="number" step="0.01" placeholder="100" class="input input-bordered input-sm font-semibold" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Unit Target</span></label>
                  <select v-model="form.targetUnit" class="select select-bordered select-sm w-full">
                    <option value="">Pilih unit</option>
                    <option value="percentage">Persentase (%)</option>
                    <option value="day">Hari</option>
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Pembanding Target</span></label>
                  <select v-model="form.targetKeterangan" class="select select-bordered select-sm w-full">
                    <option value="">Pilih</option>
                    <option value=">">&gt; (Lebih dari)</option>
                    <option value="<">&lt; (Kurang dari)</option>
                    <option value="=">= (Sama dengan)</option>
                    <option value=">=">&gt;= (Lebih dari atau sama dengan)</option>
                    <option value="<=">&lt;= (Kurang dari atau sama dengan)</option>
                  </select>
                </div>
                <div class="form-control justify-end pb-2">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input v-model="form.targetIsZero" type="checkbox" class="checkbox checkbox-primary checkbox-sm" />
                    <span class="label-text text-xs font-semibold">Target adalah Nol</span>
                  </label>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Kriteria Inklusi</span></label>
                  <input v-model="form.kriteriaInklusi" type="text" placeholder="Semua subjek yang memenuhi kriteria..." class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Kriteria Eksklusi</span></label>
                  <input v-model="form.kriteriaEksklusi" type="text" placeholder="Subjek yang tidak diikutkan..." class="input input-bordered input-sm" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Tujuan Pengukuran</span></label>
                  <input v-model="form.tujuan" type="text" placeholder="Hasil yang ingin dicapai..." class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Metode Pengumpulan Data</span></label>
                  <input v-model="form.metodePengumpulanData" type="text" placeholder="Contoh: Retrospektif, Observasi" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Sumber Data</span></label>
                  <input v-model="form.sumberData" type="text" placeholder="Contoh: Rekam Medis, Sensus Harian" class="input input-bordered input-sm" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Instrumen Pengambilan Data</span></label>
                  <input v-model="form.instrumenPengambilanData" type="text" placeholder="Formulir observasi/IT..." class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Besar Sampel</span></label>
                  <input v-model="form.besarSampel" type="text" placeholder="Total sampel minimal..." class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Cara Pengambilan Sampel</span></label>
                  <input v-model="form.caraPengambilanSampel" type="text" placeholder="Contoh: Total Sampling, Probability" class="input input-bordered input-sm" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Periode Pengumpulan</span></label>
                  <input v-model="form.periodePengumpulanData" type="text" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Penyajian Data</span></label>
                  <input v-model="form.penyajianData" type="text" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Periode Analisis & Laporan</span></label>
                  <input v-model="form.periodeAnalisisDanPelaporanData" type="text" class="input input-bordered input-sm" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text text-xs font-semibold">Penanggung Jawab</span></label>
                  <input v-model="form.penanggungJawab" type="text" placeholder="Kepala unit / komite mutu..." class="input input-bordered input-sm" />
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Action Footer -->
          <div class="p-6 border-t border-base-200 flex justify-between shrink-0 bg-base-50">
            <button type="button" @click="showModal = false" class="btn btn-ghost" :disabled="saving">Batal</button>
            <div class="flex gap-2">
              <button 
                v-if="currentTab === 'scoring'" 
                type="button" 
                @click="currentTab = 'profile'" 
                class="btn btn-secondary gap-2"
              >
                Lanjut ke Profil
                <ArrowRight class="w-4 h-4" />
              </button>
              <button 
                v-if="currentTab === 'profile'" 
                type="button" 
                @click="currentTab = 'scoring'" 
                class="btn btn-ghost"
              >
                Kembali
              </button>
              <button 
                type="button" 
                @click="savePlan" 
                class="btn btn-primary gap-2" 
                :disabled="saving || !form.judul || !form.indicatorCategoryId"
              >
                <Save class="w-4 h-4" />
                {{ saving ? 'Menyimpan...' : 'Simpan Usulan' }}
              </button>
            </div>
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
        <div class="modal-box max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <!-- Header -->
          <div class="p-6 border-b border-base-200 flex justify-between items-center bg-base-100 shrink-0">
            <div>
              <h3 class="font-bold text-lg text-base-content">Detail Usulan Perencanaan</h3>
              <p class="text-xs text-base-content/60 mt-0.5">Dibuat oleh: <span class="font-bold">{{ currentPlan?.creatorName || '-' }}</span> | Unit: {{ currentPlan?.unitName }}</p>
            </div>
            <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="showDetailModal = false">✕</button>
          </div>

          <!-- Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Status Info Box -->
            <div v-if="currentPlan?.status === 'rejected'" class="alert alert-error flex items-start gap-3">
              <ShieldAlert class="w-5 h-5 shrink-0 mt-0.5 text-error-content" />
              <div>
                <p class="font-bold text-sm text-error-content">Usulan Ditolak</p>
                <p class="text-xs text-error-content/90 mt-0.5">Alasan: {{ currentPlan?.rejectedNotes }}</p>
              </div>
            </div>

            <div v-if="currentPlan?.status === 'approved'" class="alert alert-success flex items-start gap-3">
              <CheckCircle class="w-5 h-5 shrink-0 mt-0.5 text-success-content" />
              <div>
                <p class="font-bold text-sm text-success-content">Usulan Disetujui</p>
                <p class="text-xs text-success-content/90 mt-0.5">
                  Telah diterbitkan ke Master Indikator.
                </p>
              </div>
            </div>

            <!-- Scoring matrix result -->
            <div class="card bg-base-100 border border-base-200 overflow-hidden">
              <div class="bg-base-200/50 px-4 py-3 border-b border-base-200 flex justify-between items-center">
                <span class="font-bold text-sm flex items-center gap-1.5"><Award class="w-4 h-4 text-primary" /> Matriks Scoring Pemilihan</span>
                <span class="text-lg font-extrabold text-primary">Total Skor: {{ currentPlan?.totalScore }} / 40</span>
              </div>
              <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="c in criteria" :key="c.id" class="flex justify-between items-center py-2 px-3 bg-base-50 rounded-xl border border-base-100">
                  <div>
                    <p class="font-semibold text-xs text-base-content">{{ c.name }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <!-- Progress visual -->
                    <progress class="progress progress-primary w-16" :value="(currentPlan as any)?.[c.key]" max="5"></progress>
                    <span class="badge badge-primary font-bold text-xs">{{ (currentPlan as any)?.[c.key] }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Profil / Kamus Table layout -->
            <div class="border border-base-300 rounded-2xl overflow-hidden bg-base-100">
              <div class="bg-base-200/50 px-4 py-3 border-b border-base-300 font-bold text-sm">
                Profil / Kamus Indikator Usulan
              </div>
              <div class="divide-y divide-base-200 text-sm">
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Judul Indikator</div>
                  <div class="md:col-span-3 font-semibold text-base-content">{{ currentPlan?.judul }}</div>
                </div>
                <div v-if="currentPlan?.dasarPemikiran" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Dasar Pemikiran</div>
                  <div class="md:col-span-3 whitespace-pre-wrap">{{ currentPlan?.dasarPemikiran }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Dimensi Mutu</div>
                  <div class="md:col-span-3">{{ currentPlan?.dimensiMutu || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Tujuan</div>
                  <div class="md:col-span-3">{{ currentPlan?.tujuan || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Definisi Operasional</div>
                  <div class="md:col-span-3 whitespace-pre-wrap">{{ currentPlan?.definisiOperasional || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Jenis Indikator</div>
                  <div class="md:col-span-3">{{ currentPlan?.jenisIndikator || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Satuan Pengukuran</div>
                  <div class="md:col-span-3">{{ currentPlan?.satuanPengukuran || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Numerator (Pembilang)</div>
                  <div class="md:col-span-3">{{ currentPlan?.numerator || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Denominator (Penyebut)</div>
                  <div class="md:col-span-3">{{ currentPlan?.denominator || '-' }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Formula</div>
                  <div class="md:col-span-3 font-mono">{{ currentPlan?.targetCalculationFormula || '-' }}</div>
                </div>
                <div v-if="currentPlan?.formula" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Keterangan Formula</div>
                  <div class="md:col-span-3 whitespace-pre-wrap">{{ currentPlan?.formula }}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Target Pencapaian</div>
                  <div class="md:col-span-3 font-bold text-success">{{ formatTarget(currentPlan!) }}</div>
                </div>
                <div v-if="currentPlan?.kriteriaInklusi" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Kriteria Inklusi</div>
                  <div class="md:col-span-3">{{ currentPlan?.kriteriaInklusi }}</div>
                </div>
                <div v-if="currentPlan?.kriteriaEksklusi" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Kriteria Eksklusi</div>
                  <div class="md:col-span-3">{{ currentPlan?.kriteriaEksklusi }}</div>
                </div>
                <div v-if="currentPlan?.metodePengumpulanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Metode Pengumpulan Data</div>
                  <div class="md:col-span-3">{{ currentPlan?.metodePengumpulanData }}</div>
                </div>
                <div v-if="currentPlan?.sumberData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Sumber Data</div>
                  <div class="md:col-span-3">{{ currentPlan?.sumberData }}</div>
                </div>
                <div v-if="currentPlan?.instrumenPengambilanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Instrumen Pengambilan Data</div>
                  <div class="md:col-span-3">{{ currentPlan?.instrumenPengambilanData }}</div>
                </div>
                <div v-if="currentPlan?.besarSampel" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Besar Sampel</div>
                  <div class="md:col-span-3">{{ currentPlan?.besarSampel }}</div>
                </div>
                <div v-if="currentPlan?.caraPengambilanSampel" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Cara Pengambilan Sampel</div>
                  <div class="md:col-span-3">{{ currentPlan?.caraPengambilanSampel }}</div>
                </div>
                <div v-if="currentPlan?.periodePengumpulanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Periode Pengumpulan Data</div>
                  <div class="md:col-span-3">{{ currentPlan?.periodePengumpulanData }}</div>
                </div>
                <div v-if="currentPlan?.penyajianData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Penyajian Data</div>
                  <div class="md:col-span-3">{{ currentPlan?.penyajianData }}</div>
                </div>
                <div v-if="currentPlan?.periodeAnalisisDanPelaporanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Periode Analisis & Pelaporan</div>
                  <div class="md:col-span-3">{{ currentPlan?.periodeAnalisisDanPelaporanData }}</div>
                </div>
                <div v-if="currentPlan?.penanggungJawab" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                  <div class="font-semibold text-base-content/70">Penanggung Jawab</div>
                  <div class="md:col-span-3">{{ currentPlan?.penanggungJawab }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-6 border-t border-base-200 bg-base-50 flex justify-between shrink-0">
            <button type="button" @click="showDetailModal = false" class="btn">Tutup</button>
            <div v-if="currentPlan?.status === 'proposed' && isReviewer" class="flex gap-2">
              <button @click="openReject" class="btn btn-error text-error-content gap-2">
                <XCircle class="w-4 h-4" />
                Tolak Usulan
              </button>
              <button @click="openApprove" class="btn btn-success text-success-content gap-2">
                <CheckCircle class="w-4 h-4" />
                Setujui & Publikasikan
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </Teleport>

    <!-- Approve Confirmation Modal -->
    <Teleport to="body">
      <dialog :class="['modal modal-xs', { 'modal-open': showApproveModal }]" :open="showApproveModal" style="z-index: 11000">
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
            <CheckCircle class="w-5 h-5 text-success" />
            Setujui Usulan Indikator
          </h3>
          <p class="text-xs text-base-content/60 mt-2">
            Persetujuan akan mempublikasikan usulan ini ke live master indikator. Masukkan **Kode Indikator** unik untuk master indikator.
          </p>
          <div class="form-control mt-4">
            <label class="label"><span class="label-text text-xs font-semibold">Kode Indikator Baru <span class="text-error">*</span></span></label>
            <input 
              v-model="newIndicatorCode" 
              type="text" 
              placeholder="Contoh: IND.MUTU.001" 
              class="input input-bordered input-sm font-mono font-bold" 
              required
            />
          </div>
          <div class="modal-action">
            <button type="button" @click="showApproveModal = false" class="btn btn-sm btn-ghost" :disabled="processLoading">Batal</button>
            <button 
              type="button" 
              @click="confirmApprove" 
              class="btn btn-sm btn-success text-success-content" 
              :disabled="processLoading || !newIndicatorCode"
            >
              <span v-if="processLoading" class="loading loading-spinner loading-xs"></span>
              Setujui
            </button>
          </div>
        </div>
      </dialog>
    </Teleport>

    <!-- Reject Confirmation Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showRejectModal }]" :open="showRejectModal" style="z-index: 11000">
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-lg text-base-content flex items-center gap-2">
            <XCircle class="w-5 h-5 text-error" />
            Tolak Usulan Indikator
          </h3>
          <p class="text-xs text-base-content/60 mt-2">
            Berikan alasan penolakan secara rinci agar unit pengusul dapat memperbaiki usulan ini.
          </p>
          <div class="form-control mt-4">
            <label class="label"><span class="label-text text-xs font-semibold">Alasan Penolakan <span class="text-error">*</span></span></label>
            <textarea 
              v-model="rejectionReason" 
              placeholder="Tulis alasan..." 
              class="textarea textarea-bordered h-24 text-sm" 
              required
            ></textarea>
          </div>
          <div class="modal-action">
            <button type="button" @click="showRejectModal = false" class="btn btn-sm btn-ghost" :disabled="processLoading">Batal</button>
            <button 
              type="button" 
              @click="confirmReject" 
              class="btn btn-sm btn-error text-error-content" 
              :disabled="processLoading || !rejectionReason"
            >
              <span v-if="processLoading" class="loading loading-spinner loading-xs"></span>
              Tolak Usulan
            </button>
          </div>
        </div>
      </dialog>
    </Teleport>
  </div>
</template>
