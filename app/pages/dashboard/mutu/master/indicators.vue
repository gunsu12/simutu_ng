<script setup lang="ts">
import { Search, Plus, Edit, Trash2, FileText, Filter, RefreshCw, Upload, Eye } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface IndicatorCategory {
  id: string
  name: string
}

interface Indicator {
  id: string
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
  target: string | null
  targetUnit: string | null
  targetKeterangan: string | null
  targetIsZero: boolean
  targetCalculationFormula: string | null
  documentFile: string | null
  createdAt: string
  updatedAt: string
}

// Use useLazyFetch for non-blocking data fetching
const { data: indicatorsData, pending: loadingIndicators, error: indicatorsError, refresh: refreshIndicators } = useLazyFetch<{
  success: boolean
  data: Indicator[]
}>('/api/indicators', {
  default: () => ({ success: false, data: [] })
})

const { data: categoriesData, pending: loadingCategories } = useLazyFetch<{
  success: boolean
  data: IndicatorCategory[]
}>('/api/indicator-categories', {
  default: () => ({ success: false, data: [] })
})

const indicators = computed(() => indicatorsData.value?.data || [])
const categories = computed(() => categoriesData.value?.data || [])
const loading = computed(() => loadingIndicators.value || loadingCategories.value)

const searchQuery = ref('')
const filterCategoryId = ref('')
const showModal = ref(false)
const showDetailModal = ref(false)
const isEditing = ref(false)
const currentIndicator = ref<Indicator | null>(null)
const saving = ref(false)
const errorMessage = ref('')

// Form data with all fields
const form = ref({
  indicatorCategoryId: '',
  code: '',
  judul: '',
  dimensiMutu: '',
  tujuan: '',
  definisiOperasional: '',
  formula: '',
  numerator: '',
  denominator: '',
  target: '',
  targetUnit: '',
  targetKeterangan: '',
  targetIsZero: false,
  targetCalculationFormula: '',
  documentFile: ''
})

const resetForm = () => {
  form.value = {
    indicatorCategoryId: '',
    code: '',
    judul: '',
    dimensiMutu: '',
    tujuan: '',
    definisiOperasional: '',
    formula: '',
    numerator: '',
    denominator: '',
    target: '',
    targetUnit: '',
    targetKeterangan: '',
    targetIsZero: false,
    targetCalculationFormula: '',
    documentFile: ''
  }
}

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
    indicatorCategoryId: indicator.indicatorCategoryId,
    code: indicator.code,
    judul: indicator.judul,
    dimensiMutu: indicator.dimensiMutu || '',
    tujuan: indicator.tujuan || '',
    definisiOperasional: indicator.definisiOperasional || '',
    formula: indicator.formula || '',
    numerator: indicator.numerator || '',
    denominator: indicator.denominator || '',
    target: indicator.target || '',
    targetUnit: indicator.targetUnit || '',
    targetKeterangan: indicator.targetKeterangan || '',
    targetIsZero: indicator.targetIsZero,
    targetCalculationFormula: indicator.targetCalculationFormula || '',
    documentFile: indicator.documentFile || ''
  }
  errorMessage.value = ''
  showModal.value = true
}

const openDetailModal = (indicator: Indicator) => {
  currentIndicator.value = indicator
  showDetailModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
  errorMessage.value = ''
}

const closeDetailModal = () => {
  showDetailModal.value = false
  currentIndicator.value = null
}

const saveIndicator = async () => {
  if (!form.value.indicatorCategoryId || !form.value.code.trim() || !form.value.judul.trim()) {
    errorMessage.value = 'Category, Code, and Judul are required'
    return
  }

  saving.value = true
  errorMessage.value = ''
  
  try {
    const payload = {
      ...form.value,
      target: form.value.target ? parseFloat(form.value.target) : null
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

const formatTarget = (indicator: Indicator) => {
  if (!indicator.target) return '-'
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
        <button @click="openCreateModal" class="btn btn-primary gap-2">
          <Plus class="w-4 h-4" />
          Add Indicator
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <td class="text-right">
                  <div class="flex justify-end gap-1">
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
      <dialog :class="['modal', { 'modal-open': showModal }]">
        <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditing ? 'Edit Indicator' : 'Add New Indicator' }}
          </h3>

          <!-- Error Message -->
          <div v-if="errorMessage" class="alert alert-error mb-4">
            <span>{{ errorMessage }}</span>
          </div>

          <form @submit.prevent="saveIndicator" class="space-y-4">
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
                  v-model="form.target"
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
                <span class="label-text">Document File URL</span>
              </label>
              <input
                v-model="form.documentFile"
                type="text"
                placeholder="https://example.com/document.pdf"
                class="input input-bordered"
                :disabled="saving"
              />
              <label class="label">
                <span class="label-text-alt">Enter the URL of the uploaded document</span>
              </label>
            </div>

            <div class="modal-action">
              <button type="button" @click="closeModal" class="btn" :disabled="saving">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <span v-if="saving" class="loading loading-spinner loading-sm"></span>
                <span v-else>{{ isEditing ? 'Update' : 'Create' }}</span>
              </button>
            </div>
          </form>
        </div>
        <div class="modal-backdrop bg-black/50" @click="closeModal"></div>
      </dialog>
    </Teleport>

    <!-- Detail Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showDetailModal }]">
        <div class="modal-box max-w-3xl">
          <h3 class="font-bold text-lg mb-4">Indicator Details</h3>
          
          <div v-if="currentIndicator" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-base-content/60">Code</label>
                <p class="font-mono font-medium">{{ currentIndicator.code }}</p>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Category</label>
                <p class="font-medium">{{ currentIndicator.categoryName }}</p>
              </div>
            </div>

            <div>
              <label class="text-sm text-base-content/60">Judul</label>
              <p class="font-medium">{{ currentIndicator.judul }}</p>
            </div>

            <div v-if="currentIndicator.dimensiMutu">
              <label class="text-sm text-base-content/60">Dimensi Mutu</label>
              <p>{{ currentIndicator.dimensiMutu }}</p>
            </div>

            <div v-if="currentIndicator.tujuan">
              <label class="text-sm text-base-content/60">Tujuan</label>
              <p class="whitespace-pre-wrap">{{ currentIndicator.tujuan }}</p>
            </div>

            <div v-if="currentIndicator.definisiOperasional">
              <label class="text-sm text-base-content/60">Definisi Operasional</label>
              <p class="whitespace-pre-wrap">{{ currentIndicator.definisiOperasional }}</p>
            </div>

            <div class="divider">Formula & Target</div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-sm text-base-content/60">Numerator</label>
                <p>{{ currentIndicator.numerator || '-' }}</p>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Denominator</label>
                <p>{{ currentIndicator.denominator || '-' }}</p>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Calculation Formula</label>
                <p class="font-mono">{{ currentIndicator.targetCalculationFormula || '-' }}</p>
              </div>
            </div>

            <div v-if="currentIndicator.formula">
              <label class="text-sm text-base-content/60">Formula Description</label>
              <p class="whitespace-pre-wrap">{{ currentIndicator.formula }}</p>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-sm text-base-content/60">Target</label>
                <p>{{ formatTarget(currentIndicator) }}</p>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Target is Zero</label>
                <p>{{ currentIndicator.targetIsZero ? 'Yes' : 'No' }}</p>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Document</label>
                <a v-if="currentIndicator.documentFile" :href="currentIndicator.documentFile" target="_blank" class="link link-primary">
                  View Document
                </a>
                <p v-else>-</p>
              </div>
            </div>
          </div>

          <div class="modal-action">
            <button @click="closeDetailModal" class="btn">Close</button>
            <button @click="closeDetailModal(); openEditModal(currentIndicator!)" class="btn btn-primary">
              <Edit class="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
        <div class="modal-backdrop bg-black/50" @click="closeDetailModal"></div>
      </dialog>
    </Teleport>
  </div>
</template>
