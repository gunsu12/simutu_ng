<script setup lang="ts">
import { Search, Plus, Edit, Trash2, FileText, Filter, RefreshCw, Upload, Eye, Users } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface IndicatorCategory {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
  unitCode: string
}

interface IndicatorUnit {
  id: string
  indicatorId: string
  unitId: string
  unitName: string
  unitCode: string
}

interface Indicator {
  id: string
  siteId: string
  indicatorCategoryId: string
  categoryName: string
  code: string
  judul: string
  dimensiMutu: string | null
  tujuan: string | null
  definisiOperasional: string | null
  formula: string | null
  numerator: string | null
  denominator: string | null
  target: number | null
  targetUnit: string | null
  targetKeterangan: string | null
  targetIsZero: boolean
  targetCalculationFormula: string | null
  documentFile: string | null
  targetWeight?: number | null
  entryFrequency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')
const selectedSiteId = ref('')

// Declare refs first
const searchQuery = ref('')
const filterCategoryId = ref('')
const showModal = ref(false)
const showDetailModal = ref(false)
const detailIndicatorId = ref('')
const showUnitsModal = ref(false)
const isEditing = ref(false)
const currentIndicator = ref<Indicator | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const uploadingFile = ref(false)
const selectedFile = ref<File | null>(null)
const uploadProgress = ref(0)
const selectedIndicatorForUnits = ref<Indicator | null>(null)
const assignedUnits = ref<IndicatorUnit[]>([])
const availableUnits = ref<Unit[]>([])
const loadingUnits = ref(false)
const selectedUnitId = ref('')

// Form data with all fields
const form = ref({
  siteId: '',
  indicatorCategoryId: '',
  code: '',
  judul: '',
  dimensiMutu: '',
  tujuan: '',
  definisiOperasional: '',
  formula: '',
  numerator: '',
  denominator: '',
  target: 0 as number,
  targetWeight: 0 as number,
  targetUnit: '',
  targetKeterangan: '',
  targetIsZero: false,
  targetCalculationFormula: '',
  documentFile: '',
  entryFrequency: 'monthly'
})

// Fetch sites for admin filter
const { data: sitesData } = useLazyFetch<{
  success: boolean
  data: Site[]
}>('/api/sites', {
  default: () => ({ success: false, data: [] })
})

const sites = computed(() => sitesData.value?.data || [])

// Use useLazyFetch for non-blocking data fetching
const { data: indicatorsData, pending: loadingIndicators, error: indicatorsError, refresh: refreshIndicators } = useLazyFetch<{
  success: boolean
  data: Indicator[]
}>(() => {
  const params = new URLSearchParams()
  if (isAdmin.value && selectedSiteId.value) {
    params.append('siteId', selectedSiteId.value)
  }
  return `/api/indicators?${params.toString()}`
}, {
  default: () => ({ success: false, data: [] }),
  watch: [selectedSiteId]
})

const { data: categoriesData, pending: loadingCategories } = useLazyFetch<{
  success: boolean
  data: IndicatorCategory[]
}>(() => {
  const params = new URLSearchParams()
  // Filter categories by selected site when admin is creating new indicator
  if (isAdmin.value && form.value.siteId && showModal.value && !isEditing.value) {
    params.append('siteId', form.value.siteId)
  }
  return `/api/indicator-categories?${params.toString()}`
}, {
  default: () => ({ success: false, data: [] }),
  watch: [() => form.value.siteId, showModal, isEditing]
})

const indicators = computed(() => indicatorsData.value?.data || [])
const categories = computed(() => categoriesData.value?.data || [])
const loading = computed(() => loadingIndicators.value || loadingCategories.value)

const resetForm = () => {
  form.value = {
    siteId: isAdmin.value ? '' : (user.value?.siteId || ''),
    indicatorCategoryId: '',
    code: '',
    judul: '',
    dimensiMutu: '',
    tujuan: '',
    definisiOperasional: '',
    formula: '',
    numerator: '',
    denominator: '',
    target: 0,
    targetWeight: 0,
    targetUnit: '',
    targetKeterangan: '',
    targetIsZero: false,
    targetCalculationFormula: '',
    documentFile: '',
    entryFrequency: 'monthly'
  }
}

// Watch for site changes and reset category selection
watch(() => form.value.siteId, () => {
  if (showModal.value && !isEditing.value) {
    form.value.indicatorCategoryId = ''
  }
})

const filteredIndicators = computed(() => {
  let result = indicators.value
  
  // Filter by category
  if (filterCategoryId.value) {
    result = result.filter(ind => ind.indicatorCategoryId === filterCategoryId.value)
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(ind => 
      ind.code.toLowerCase().includes(query) ||
      ind.judul.toLowerCase().includes(query) ||
      ind.categoryName?.toLowerCase().includes(query)
    )
  }
  
  return result
})

const openCreateModal = () => {
  isEditing.value = false
  currentIndicator.value = null
  resetForm()
  errorMessage.value = ''
  showModal.value = true
}

const openEditModal = (indicator: Indicator) => {
  isEditing.value = true
  currentIndicator.value = indicator
    form.value = {
    siteId: isAdmin.value ? '' : (user.value?.siteId || ''),
    indicatorCategoryId: indicator.indicatorCategoryId,
    code: indicator.code,
    judul: indicator.judul,
    dimensiMutu: indicator.dimensiMutu || '',
    tujuan: indicator.tujuan || '',
    definisiOperasional: indicator.definisiOperasional || '',
    formula: indicator.formula || '',
    numerator: indicator.numerator || '',
    denominator: indicator.denominator || '',
    target: indicator.target !== undefined && indicator.target !== null ? Number(indicator.target) : 0,
    targetWeight: indicator.targetWeight !== undefined && indicator.targetWeight !== null ? Number(indicator.targetWeight) : 0,
    targetUnit: indicator.targetUnit || '',
    targetKeterangan: indicator.targetKeterangan || '',
    targetIsZero: indicator.targetIsZero,
    targetCalculationFormula: indicator.targetCalculationFormula || '',
    documentFile: indicator.documentFile || '',
    entryFrequency: indicator.entryFrequency || 'monthly'
  }
  errorMessage.value = ''
  showModal.value = true
}

const openDetailModal = (indicator: Indicator) => {
  detailIndicatorId.value = indicator.id
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  detailIndicatorId.value = ''
}

const handleEditFromDetail = (indicator: Indicator) => {
  closeDetailModal()
  openEditModal(indicator)
}

const closeModal = () => {
  showModal.value = false
  resetForm()
  errorMessage.value = ''
  selectedFile.value = null
  uploadProgress.value = 0
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0 && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const uploadDocument = async () => {
  if (!selectedFile.value) {
    errorMessage.value = 'Please select a file first'
    return
  }

  uploadingFile.value = true
  uploadProgress.value = 0
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('folder', 'indicators/documents')

    // Use XMLHttpRequest to track upload progress
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    })

    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            resolve(response.url)
          } else {
            reject(new Error(response.message || 'Upload failed'))
          }
        } else {
          reject(new Error('Upload failed'))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.open('POST', '/api/upload')
      xhr.send(formData)
    })

    const fileUrl = await uploadPromise
    form.value.documentFile = fileUrl
    selectedFile.value = null
    uploadProgress.value = 0
  } catch (err: any) {
    console.error('Upload error:', err)
    errorMessage.value = err.message || 'Failed to upload file'
  } finally {
    uploadingFile.value = false
  }
}

const removeDocument = () => {
  form.value.documentFile = ''
  selectedFile.value = null
}

const openUnitsModal = async (indicator: Indicator) => {
  selectedIndicatorForUnits.value = indicator
  showUnitsModal.value = true
  await loadIndicatorUnits(indicator.id)
  await loadAvailableUnits(indicator.siteId)
}

const closeUnitsModal = () => {
  showUnitsModal.value = false
  selectedIndicatorForUnits.value = null
  assignedUnits.value = []
  availableUnits.value = []
  selectedUnitId.value = ''
}

const loadIndicatorUnits = async (indicatorId: string) => {
  loadingUnits.value = true
  try {
    const response = await $fetch<{ success: boolean; data: IndicatorUnit[] }>(`/api/indicator-units?indicatorId=${indicatorId}`)
    if (response.success) {
      assignedUnits.value = response.data
    }
  } catch (error) {
    console.error('Error loading indicator units:', error)
  } finally {
    loadingUnits.value = false
  }
}

const loadAvailableUnits = async (siteId: string) => {
  try {
    const response = await $fetch<{ success: boolean; data: Unit[] }>(`/api/units?siteId=${siteId}`)
    if (response.success) {
      availableUnits.value = response.data
    }
  } catch (error) {
    console.error('Error loading units:', error)
  }
}

const assignUnitToIndicator = async () => {
  if (!selectedUnitId.value || !selectedIndicatorForUnits.value) return

  try {
    const response = await $fetch<{ success: boolean; message?: string }>('/api/indicator-units', {
      method: 'POST',
      body: {
        indicatorId: selectedIndicatorForUnits.value.id,
        unitId: selectedUnitId.value
      }
    })

    if (response.success) {
      await loadIndicatorUnits(selectedIndicatorForUnits.value.id)
      selectedUnitId.value = ''
    } else {
      alert(response.message || 'Failed to assign unit')
    }
  } catch (error: any) {
    console.error('Error assigning unit:', error)
    alert(error.data?.message || 'Failed to assign unit')
  }
}

const removeUnitFromIndicator = async (indicatorUnitId: string) => {
  if (!confirm('Are you sure you want to remove this unit assignment?')) return

  try {
    const response = await $fetch<{ success: boolean }>(`/api/indicator-units/${indicatorUnitId}`, {
      method: 'DELETE'
    })

    if (response.success && selectedIndicatorForUnits.value) {
      await loadIndicatorUnits(selectedIndicatorForUnits.value.id)
    }
  } catch (error: any) {
    console.error('Error removing unit:', error)
    alert(error.data?.message || 'Failed to remove unit')
  }
}

const saveIndicator = async () => {
  if (!form.value.indicatorCategoryId || !form.value.code.trim() || !form.value.judul.trim()) {
    errorMessage.value = 'Category, Code, and Judul are required'
    return
  }

  if (isAdmin.value && !form.value.siteId && !isEditing.value) {
    errorMessage.value = 'Site is required'
    return
  }

  saving.value = true
  errorMessage.value = ''
  
  try {
    const payload = {
      ...form.value,
      target: Number(form.value.target),
      targetWeight: form.value.targetWeight !== null && form.value.targetWeight !== undefined ? Number(form.value.targetWeight) : 0,
    }

    if (isEditing.value && currentIndicator.value) {
      const response = await $fetch<{ success: boolean; message?: string }>(`/api/indicators/${currentIndicator.value.id}`, {
        method: 'PUT',
        body: payload
      })
      if (response.success) {
        await refreshIndicators()
        closeModal()
      } else {
        errorMessage.value = response.message || 'Failed to update indicator'
      }
    } else {
      const response = await $fetch<{ success: boolean; message?: string }>('/api/indicators', {
        method: 'POST',
        body: payload
      })
      if (response.success) {
        await refreshIndicators()
        closeModal()
      } else {
        errorMessage.value = response.message || 'Failed to create indicator'
      }
    }
  } catch (err: any) {
    console.error('Error saving indicator:', err)
    errorMessage.value = err.data?.message || err.message || 'An error occurred'
  } finally {
    saving.value = false
  }
}

const deleteIndicator = async (id: string) => {
  if (!confirm('Are you sure you want to delete this indicator?')) return
  
  try {
    const response = await $fetch(`/api/indicators/${id}`, {
      method: 'DELETE'
    })
    if (response.success) {
      await refreshIndicators()
    }
  } catch (err: any) {
    console.error('Error deleting indicator:', err)
    alert(err.data?.message || 'Failed to delete indicator')
  }
}

const toggleStatus = async (indicator: Indicator) => {
  try {
    const response = await $fetch<{ success: boolean; message?: string }>(`/api/indicators/${indicator.id}`, {
      method: 'PUT',
      body: {
        ...indicator,
        isActive: !indicator.isActive
      }
    })

    if (response.success) {
      await refreshIndicators()
    } else {
      alert(response.message || 'Failed to update status')
    }
  } catch (error: any) {
    console.error('Error toggling status:', error)
    alert(error.data?.message || 'Failed to update status')
  }
}

const formatTarget = (indicator: Indicator) => {
  if (indicator.target === null || indicator.target === undefined) return '-'
  const unit = indicator.targetUnit === 'percentage' ? '%' : indicator.targetUnit === 'day' ? ' hari' : ''
  const comparison = indicator.targetKeterangan || ''
  return `${comparison} ${indicator.target}${unit}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Indicator Mutu</h1>
        <p class="text-base-content/60 mt-1">Manage quality indicators</p>
      </div>
      <div class="flex gap-2">
        <button @click="refreshIndicators()" class="btn btn-ghost btn-sm gap-2" :disabled="loading">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button type="button" @click="openCreateModal" class="btn btn-primary gap-2">
          <Plus class="w-4 h-4" />
          Tambah Indikator
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="indicatorsError" class="alert alert-error">
      <span>{{ indicatorsError.message || 'Failed to load indicators' }}</span>
      <button @click="refreshIndicators()" class="btn btn-sm">Retry</button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex items-center gap-2">
            <Search class="w-5 h-5 text-base-content/50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search indicators..."
              class="input input-sm input-bordered flex-1"
            />
          </div>
          <div class="flex items-center gap-2">
            <Filter class="w-5 h-5 text-base-content/50" />
            <select v-model="filterCategoryId" class="select select-sm select-bordered flex-1">
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div v-if="isAdmin" class="flex items-center gap-2">
            <select v-model="selectedSiteId" class="select select-sm select-bordered flex-1">
              <option value="">Semua Site</option>
              <option v-for="site in sites" :key="site.id" :value="site.id">
                {{ site.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Indicators List -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-0">
        <div v-if="loading" class="flex justify-center items-center p-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="filteredIndicators.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
          <FileText class="w-16 h-16 text-base-content/20 mb-4" />
          <p class="text-base-content/60">
            {{ searchQuery || filterCategoryId ? 'No indicators found' : 'No indicators yet' }}
          </p>
          <button v-if="!searchQuery && !filterCategoryId" @click="openCreateModal" class="btn btn-primary btn-sm mt-4">
            <Plus class="w-4 h-4" />
            Create First Indicator
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Code</th>
                <th>Judul</th>
                <th>Category</th>
                <th>Target</th>
                <th>Formula</th>
                <th>Frequency</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="indicator in filteredIndicators" :key="indicator.id">
                <td class="font-mono text-sm">{{ indicator.code }}</td>
                <td class="font-medium max-w-xs truncate">{{ indicator.judul }}</td>
                <td>
                  <span class="badge badge-outline badge-sm">{{ indicator.categoryName }}</span>
                </td>
                <td>{{ formatTarget(indicator) }}</td>
                <td>{{ indicator.targetCalculationFormula || '-' }}</td>
                <td>
                  <span :class="['badge badge-sm', indicator.entryFrequency === 'daily' ? 'badge-info' : 'badge-secondary']">
                    {{ indicator.entryFrequency === 'daily' ? 'Daily' : 'Monthly' }}
                  </span>
                </td>
                <td>
                  <button
                    @click="toggleStatus(indicator)"
                    :class="[
                      'badge badge-sm cursor-pointer',
                      indicator.isActive ? 'badge-success' : 'badge-error'
                    ]"
                  >
                    {{ indicator.isActive ? 'Active' : 'Inactive' }}
                  </button>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-1">
                    <button
                      @click="openUnitsModal(indicator)"
                      class="btn btn-ghost btn-sm btn-square"
                      title="Manage Units"
                    >
                      <Users class="w-4 h-4" />
                    </button>
                    <button
                      @click="openDetailModal(indicator)"
                      class="btn btn-ghost btn-sm btn-square"
                      title="View Details"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button
                      @click="openEditModal(indicator)"
                      class="btn btn-ghost btn-sm btn-square"
                      title="Edit"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click="deleteIndicator(indicator.id)"
                      class="btn btn-ghost btn-sm btn-square text-error"
                      title="Delete"
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

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showModal }]" :open="showModal">
        <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">✕</button>
          <h3 class="font-bold text-lg mb-4">
            {{ isEditing ? 'Edit Indikator' : 'Tambah Indikator' }}
          </h3>

          <!-- Error Message -->
          <div v-if="errorMessage" class="alert alert-error mb-4">
            <span>{{ errorMessage }}</span>
          </div>

          <form @submit.prevent="saveIndicator" class="space-y-4">
            <!-- Site Selection for Admin -->
            <div v-if="isAdmin && !isEditing" class="form-control">
              <label class="label">
                <span class="label-text">Site <span class="text-error">*</span></span>
              </label>
              <select v-model="form.siteId" class="select select-bordered" required :disabled="saving">
                <option value="">Pilih Site</option>
                <option v-for="site in sites" :key="site.id" :value="site.id">
                  {{ site.name }}
                </option>
              </select>
            </div>

            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Category <span class="text-error">*</span></span>
                </label>
                <select v-model="form.indicatorCategoryId" class="select select-bordered" required :disabled="saving">
                  <option value="">Select category</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Code <span class="text-error">*</span></span>
                </label>
                <input
                  v-model="form.code"
                  type="text"
                  placeholder="IND-001"
                  class="input input-bordered"
                  required
                  :disabled="saving"
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Judul <span class="text-error">*</span></span>
              </label>
              <input
                v-model="form.judul"
                type="text"
                placeholder="Indicator title"
                class="input input-bordered"
                required
                :disabled="saving"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Dimensi Mutu</span>
              </label>
              <input
                v-model="form.dimensiMutu"
                type="text"
                placeholder="Quality dimension"
                class="input input-bordered"
                :disabled="saving"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Tujuan</span>
              </label>
              <textarea
                v-model="form.tujuan"
                placeholder="Objective"
                class="textarea textarea-bordered h-20"
                :disabled="saving"
              ></textarea>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Definisi Operasional</span>
              </label>
              <textarea
                v-model="form.definisiOperasional"
                placeholder="Operational definition"
                class="textarea textarea-bordered h-20"
                :disabled="saving"
              ></textarea>
            </div>

            <div class="divider">Formula & Target</div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Numerator</span>
                </label>
                <input
                  v-model="form.numerator"
                  type="text"
                  placeholder="N"
                  class="input input-bordered"
                  :disabled="saving"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Denominator</span>
                </label>
                <input
                  v-model="form.denominator"
                  type="text"
                  placeholder="D"
                  class="input input-bordered"
                  :disabled="saving"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Calculation Formula</span>
                </label>
                <select v-model="form.targetCalculationFormula" class="select select-bordered" :disabled="saving">
                  <option value="">Select formula</option>
                  <option value="N/D">N/D</option>
                  <option value="N-D">N-D</option>
                  <option value="(N/D)*100">(N/D)*100</option>
                </select>
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Formula Description</span>
              </label>
              <textarea
                v-model="form.formula"
                placeholder="Formula description"
                class="textarea textarea-bordered h-20"
                :disabled="saving"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Target</span>
                </label>
                <input
                  v-model.number="form.target"
                  type="number"
                  step="0.01"
                  placeholder="90"
                  class="input input-bordered"
                  :disabled="saving"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Target Unit</span>
                </label>
                <select v-model="form.targetUnit" class="select select-bordered" :disabled="saving">
                  <option value="">Select unit</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="day">Days</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Target Comparison</span>
                </label>
                <select v-model="form.targetKeterangan" class="select select-bordered" :disabled="saving">
                  <option value="">Select</option>
                  <option value=">">&gt; (Greater than)</option>
                  <option value="<">&lt; (Less than)</option>
                  <option value="=">=  (Equal to)</option>
                  <option value=">=">&gt;= (Greater or equal)</option>
                  <option value="<=">&lt;= (Less or equal)</option>
                </select>
              </div>
              

            <div class="form-control">
              <label class="label">
                <span class="label-text">Target Weight <span class="text-error">*</span></span>
              </label>
              <input
                v-model.number="form.targetWeight"
                type="number"
                step="0.01"
                placeholder="0"
                class="input input-bordered"
                :disabled="saving"
                required
              />
              <label class="label">
                <span class="label-text-alt">Relative weight for this indicator (numeric, default 0)</span>
              </label>
            </div>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  v-model="form.targetIsZero"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                  :disabled="saving"
                />
                <span class="label-text">Target is Zero</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Document File</span>
              </label>
              
              <!-- Show current file if exists -->
              <div v-if="form.documentFile" class="mb-3 p-3 bg-base-200 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <FileText class="w-5 h-5 text-primary" />
                  <a :href="form.documentFile" target="_blank" class="link link-primary text-sm">
                    View current document
                  </a>
                </div>
                <button
                  type="button"
                  @click="removeDocument"
                  class="btn btn-ghost btn-sm btn-circle text-error"
                  :disabled="saving || uploadingFile"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <!-- File upload section -->
              <div class="flex gap-2">
                <input
                  type="file"
                  @change="handleFileSelect"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  class="file-input file-input-bordered flex-1"
                  :disabled="saving || uploadingFile"
                />
                <button
                  type="button"
                  @click="uploadDocument"
                  class="btn btn-primary"
                  :disabled="!selectedFile || saving || uploadingFile"
                >
                  <Upload class="w-4 h-4" />
                  {{ uploadingFile ? 'Uploading...' : 'Upload' }}
                </button>
              </div>

              <!-- Upload progress -->
              <div v-if="uploadingFile" class="mt-2">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{{ uploadProgress }}%</span>
                </div>
                <progress class="progress progress-primary w-full" :value="uploadProgress" max="100"></progress>
              </div>

              <label class="label">
                <span class="label-text-alt">Upload PDF, DOC, DOCX, XLS, or XLSX files</span>
              </label>
            </div>

            <!-- Entry Frequency -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Entry Frequency <span class="text-error">*</span></span>
              </label>
              <select v-model="form.entryFrequency" class="select select-bordered" required>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
              <label class="label">
                <span class="label-text-alt">How often this indicator data will be entered</span>
              </label>
            </div>

            <div class="modal-action">
              <button type="button" @click="closeModal" class="btn" :disabled="saving">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <span v-if="saving" class="loading loading-spinner loading-sm"></span>
                <span v-else>{{ isEditing ? 'Update' : 'Simpan' }}</span>
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" @click="closeModal">close</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Units Mapping Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showUnitsModal }]" :open="showUnitsModal">
        <div class="modal-box max-w-2xl">
          <button type="button" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeUnitsModal">✕</button>
          <h3 class="font-bold text-lg mb-4">
            Manage Units for: {{ selectedIndicatorForUnits?.judul }}
          </h3>

          <!-- Assigned Units List -->
          <div class="mb-6">
            <h4 class="font-semibold mb-3">Assigned Units</h4>
            <div v-if="loadingUnits" class="flex justify-center py-4">
              <span class="loading loading-spinner loading-md"></span>
            </div>
            <div v-else-if="assignedUnits.length === 0" class="text-center py-4 text-base-content/60">
              No units assigned yet
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="unit in assignedUnits"
                :key="unit.id"
                class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
              >
                <div>
                  <p class="font-medium">{{ unit.unitName }}</p>
                  <p class="text-sm text-base-content/60">{{ unit.unitCode }}</p>
                </div>
                <button
                  @click="removeUnitFromIndicator(unit.id)"
                  class="btn btn-ghost btn-sm btn-circle text-error"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Add New Unit -->
          <div class="divider">Add Unit</div>
          <div class="flex gap-2">
            <select v-model="selectedUnitId" class="select select-bordered flex-1">
              <option value="">Select a unit to assign</option>
              <option
                v-for="unit in availableUnits.filter(u => !assignedUnits.some(au => au.unitId === u.id))"
                :key="unit.id"
                :value="unit.id"
              >
                {{ unit.name }} ({{ unit.unitCode }})
              </option>
            </select>
            <button
              @click="assignUnitToIndicator"
              class="btn btn-primary"
              :disabled="!selectedUnitId"
            >
              <Plus class="w-4 h-4" />
              Assign
            </button>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeUnitsModal" class="btn">Close</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" @click="closeUnitsModal">close</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Detail Modal Component -->
    <IndicatorDetailModal 
      :indicator-id="detailIndicatorId"
      :is-open="showDetailModal"
      @close="closeDetailModal"
      @edit="handleEditFromDetail"
    />
  </div>
</template>
