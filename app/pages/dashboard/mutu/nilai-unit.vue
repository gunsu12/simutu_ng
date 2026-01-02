<script setup lang="ts">
import { Plus, Search, Edit, Trash2, Calendar } from 'lucide-vue-next'

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
  entryFrequency: 'daily' | 'monthly'
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
  }
}

interface Indicator {
  id: string
  code: string
  judul: string
  numerator?: string | null
  denominator?: string | null
  entryFrequency: 'daily' | 'monthly'
}

// State
const searchQuery = ref('')
const entries = ref<IndicatorEntry[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedEntry = ref<IndicatorEntry | null>(null)

// Filter state
const filterStartDate = ref(new Date().toISOString().split('T')[0])
const filterEndDate = ref(new Date().toISOString().split('T')[0])
const filterFrequency = ref<'daily' | 'monthly' | ''>('')
const filterStatus = ref<string>('')

// Form data
const formData = ref({
  entryDate: new Date().toISOString().split('T')[0],
  entryFrequency: 'monthly' as 'daily' | 'monthly',
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
    showDetails?: boolean
  }[]
})

const availableIndicators = ref<Indicator[]>([])
const loadingIndicators = ref(false)

// Get user info from session
const { data: session } = await useFetch('/api/auth/session')
const user = computed(() => session.value?.data?.user)
const unitId = computed(() => user.value?.unitId || '')

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

    const queryString = params.toString()
    const url = `/api/indicator-entries${queryString ? '?' + queryString : ''}`
    
    const response = await $fetch<{ success: boolean; data: IndicatorEntry[] }>(url)
    if (response.success) {
      entries.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch entries:', error)
  } finally {
    loading.value = false
  }
}

async function fetchAvailableIndicators(frequency: 'daily' | 'monthly') {
  if (!unitId.value) {
    console.error('No unit ID found for user:', user.value)
    alert('Unable to load indicators: No unit assigned to your account')
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
        showDetails: false
      }))
      
      if (response.data.length === 0) {
        console.warn('No indicators found for unit:', unitId.value, 'frequency:', frequency)
      }
    }
  } catch (error) {
    console.error('Failed to fetch indicators:', error)
    alert('Failed to load indicators. Please try again.')
  } finally {
    loadingIndicators.value = false
  }
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
      showDetails: false
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
    entryFrequency: 'monthly',
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
  filterStartDate.value = new Date().toISOString().split('T')[0]
  filterEndDate.value = new Date().toISOString().split('T')[0]
  filterFrequency.value = ''
  filterStatus.value = ''
  fetchEntries()
}

// Watch entry frequency to fetch indicators
watch(() => formData.value.entryFrequency, (newFrequency) => {
  if (modalOpen.value && modalMode.value === 'create') {
    fetchAvailableIndicators(newFrequency)
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
        numeratorDenominatorResult: item.numeratorValue && item.denominatorValue 
          ? item.numeratorValue / item.denominatorValue 
          : null,
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
      }
    } else if (selectedEntry.value) {
      const response = await $fetch(`/api/indicator-entries/${selectedEntry.value.id}`, {
        method: 'PUT',
        body: payload
      })
      if (response.success) {
        await fetchEntries()
        closeModal()
      }
    }
  } catch (error) {
    console.error('Failed to save entry:', error)
    alert('Failed to save entry')
  } finally {
    loading.value = false
  }
}

async function deleteEntry(id: string) {
  if (!confirm('Are you sure you want to delete this entry?')) return

  loading.value = true
  try {
    const response = await $fetch(`/api/indicator-entries/${id}`, {
      method: 'DELETE'
    })
    if (response.success) {
      await fetchEntries()
    }
  } catch (error) {
    console.error('Failed to delete entry:', error)
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

// Fetch entries on mount
onMounted(() => {
  fetchEntries()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Nilai Mutu Unit</h1>
        <p class="text-base-content/60 mt-1">Manage indicator entries for your unit</p>
      </div>
      <button
        @click="openCreateModal"
        class="btn btn-primary gap-2"
      >
        <Plus class="w-4 h-4" />
        Add Entry
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <h3 class="font-semibold text-base-content mb-3">Filters</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <!-- Start Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-sm">Start Date</span>
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
              <span class="label-text text-sm">End Date</span>
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
              <span class="label-text text-sm">Frequency</span>
            </label>
            <select
              v-model="filterFrequency"
              @change="fetchEntries"
              class="select select-bordered select-sm"
            >
              <option value="">All Frequencies</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
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
              <option value="">All Status</option>
              <option value="proposed">Proposed</option>
              <option value="checked">Checked</option>
              <option value="pending">Pending</option>
              <option value="finish">Finish</option>
            </select>
          </div>

          <!-- Reset Button -->
          <div class="form-control flex justify-end">
            <label class="label">
              <span class="label-text text-sm invisible">Action</span>
            </label>
            <button
              @click="resetFilters"
              class="btn btn-outline btn-sm"
            >
              Reset Filters
            </button>
          </div>
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
            placeholder="Search entries..."
            class="input input-bordered w-full pl-10"
          />
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
                <th>Entry Code</th>
                <th>Entry Date</th>
                <th>Frequency</th>
                <th>Status</th>
                <th>Items</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center">Loading...</td>
              </tr>
              <tr v-else-if="filteredEntries.length === 0">
                <td colspan="6" class="text-center">No entries found</td>
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
                    {{ entry.entryFrequency }}
                  </span>
                </td>
                <td>
                  <span :class="['badge badge-sm', getStatusBadge(entry.status)]">
                    {{ entry.status }}
                  </span>
                </td>
                <td>{{ entry.items?.length || 0 }} indicators</td>
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

    <!-- Modal -->
    <dialog :open="modalOpen" class="modal modal-open" v-if="modalOpen">
      <div class="modal-box max-w-4xl">
        <h2 class="text-xl font-bold mb-4">
          {{ modalMode === 'create' ? 'Add New Entry' : 'Edit Entry' }}
        </h2>

        <form @submit.prevent="saveEntry" class="space-y-4">
          <!-- Entry Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Entry Date *</span>
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
              <span class="label-text font-medium">Entry Frequency *</span>
            </label>
            <select
              v-model="formData.entryFrequency"
              required
              :disabled="modalMode === 'edit'"
              class="select select-bordered"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes</span>
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
            <p class="text-base-content/60 mt-2">Loading indicators...</p>
          </div>
          <div v-else-if="formData.items.length > 0">
            <h3 class="text-lg font-semibold mb-3">Indicators</h3>
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
                      <details class="cursor-pointer" @toggle="item.showDetails = !item.showDetails">
                        <summary class="text-sm text-base-content/60 hover:text-base-content">
                          📋 View indicator details
                        </summary>
                        <div class="mt-3 space-y-2 text-sm">
                          <div v-if="item.numeratorDesc" class="divider my-2">Numerator</div>
                          <div v-if="item.numeratorDesc" class="bg-base-300 p-2 rounded text-xs">
                            {{ item.numeratorDesc }}
                          </div>
                          <div v-if="item.denominatorDesc" class="divider my-2">Denominator</div>
                          <div v-if="item.denominatorDesc" class="bg-base-300 p-2 rounded text-xs">
                            {{ item.denominatorDesc }}
                          </div>
                        </div>
                      </details>
                    </div>
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
                        placeholder="Enter numerator value"
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
                        placeholder="Enter denominator value"
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
                        placeholder="Enter score value"
                        class="input input-bordered input-sm"
                      />
                    </div>
                  </div>
                  <div class="form-control mt-3">
                    <label class="label">
                      <span class="label-text text-xs">Notes</span>
                    </label>
                    <input
                      v-model="item.notes"
                      type="text"
                      placeholder="Add notes (optional)"
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
              <h3 class="font-bold">No Indicators Found!</h3>
              <div class="text-sm">
                There are no {{ formData.entryFrequency }} indicators assigned to your unit. 
                Please contact your administrator to assign indicators to your unit in the 
                <strong>Mutu → Master → Indicators</strong> page.
              </div>
            </div>
          </div>
          <div v-else class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Select entry frequency to load indicators</span>
          </div>

          <!-- Actions -->
          <div class="modal-action">
            <button
              type="button"
              @click="closeModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading || formData.items.length === 0"
              class="btn btn-primary"
            >
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ loading ? 'Saving...' : modalMode === 'create' ? 'Create Entry' : 'Update Entry' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop" @click="closeModal">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>