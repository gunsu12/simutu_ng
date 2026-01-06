<script setup lang="ts">
import { Search, Plus, Edit, Trash2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface Site {
  id: string
  name: string
}

interface Division {
  id: string
  name: string
}

interface Employee {
  id: string
  fullName: string
  nik?: string
}

interface Unit {
  id: string
  siteId: string | null
  unitCode: string
  divisionId: string | null
  name: string
  description: string | null
  location: string | null
  headOfUnit: string | null
  createdAt: Date
  updatedAt: Date
  siteName?: string | null
  divisionName?: string | null
  headOfUnitName?: string | null
}

// State
const units = ref<Unit[]>([])
const sites = ref<Site[]>([])
const divisions = ref<Division[]>([])
const employees = ref<Employee[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const filterSiteId = ref('')
const employeeSearchQuery = ref('')
const employeeLoading = ref(false)
const employeeTotalPages = ref(1)
const employeeCurrentPage = ref(1)
const employeeInput = ref<HTMLInputElement | null>(null)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// Form data
const formData = ref({
  siteId: '',
  unitCode: '',
  divisionId: '',
  name: '',
  description: '',
  location: '',
  headOfUnit: '',
})

// Fetch units
const fetchUnits = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (filterSiteId.value) params.siteId = filterSiteId.value
    if (searchQuery.value) params.search = searchQuery.value

    const response = await $fetch<{ 
      success: boolean; 
      data: Unit[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/units', {
      query: params,
    })
    if (response.success) {
      units.value = response.data
      totalItems.value = response.meta.total
      totalPages.value = response.meta.totalPages
    }
  } catch (error) {
    console.error('Failed to fetch units:', error)
  } finally {
    loading.value = false
  }
}

// Search debounce
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
watch(searchQuery, () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    currentPage.value = 1
    fetchUnits()
  }, 500)
})

// Handle filter change
const handleFilterChange = () => {
  currentPage.value = 1
  fetchUnits()
}

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchUnits()
}

// Computed displayed pages
const displayedPages = computed(() => {
  const pages = []
  const maxDisplayed = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxDisplayed / 2))
  let end = Math.min(totalPages.value, start + maxDisplayed - 1)
  
  if (end - start + 1 < maxDisplayed) {
    start = Math.max(1, end - maxDisplayed + 1)
  }
  
  for (let i = Math.max(1, start); i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Fetch sites
const fetchSites = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: Site[] }>('/api/sites')
    if (response.success) {
      sites.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch sites:', error)
  }
}

// Fetch divisions
const fetchDivisions = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: Division[] }>('/api/divisions')
    if (response.success) {
      divisions.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch divisions:', error)
  }
}

// Fetch employees
const fetchEmployees = async (search = '', page = 1) => {
  employeeLoading.value = true
  try {
    const response = await $fetch<{ 
      success: boolean; 
      data: Employee[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/employees', {
      query: { 
        search, 
        page,
        limit: 10
      }
    })
    if (response.success) {
      employees.value = response.data
      employeeTotalPages.value = response.meta.totalPages
      employeeCurrentPage.value = response.meta.page
    }
  } catch (error) {
    console.error('Failed to fetch employees:', error)
  } finally {
    employeeLoading.value = false
  }
}

// Handle employee search with debounce
let employeeSearchTimeout: ReturnType<typeof setTimeout> | null = null
const handleEmployeeSearch = () => {
  if (employeeSearchTimeout) clearTimeout(employeeSearchTimeout)
  employeeSearchTimeout = setTimeout(() => {
    fetchEmployees(employeeSearchQuery.value)
  }, 500)
}

// Open modal for create
const openCreateModal = () => {
  isEditMode.value = false
  editingId.value = null
  formData.value = {
    siteId: '',
    unitCode: '',
    divisionId: '',
    name: '',
    description: '',
    location: '',
    headOfUnit: '',
  }
  employeeSearchQuery.value = ''
  fetchEmployees()
  modalOpen.value = true
}

// Open modal for edit
const openEditModal = (unit: Unit) => {
  isEditMode.value = true
  editingId.value = unit.id
  formData.value = {
    siteId: unit.siteId || '',
    unitCode: unit.unitCode,
    divisionId: unit.divisionId || '',
    name: unit.name,
    description: unit.description || '',
    location: unit.location || '',
    headOfUnit: unit.headOfUnit || '',
  }
  
  // Set employee search query to the selected employee's name if it exists
  employeeSearchQuery.value = unit.headOfUnitName || ''
  fetchEmployees(unit.headOfUnitName || '')
  
  modalOpen.value = true
}

// Close modal
const closeModal = () => {
  modalOpen.value = false
  formData.value = {
    siteId: '',
    unitCode: '',
    divisionId: '',
    name: '',
    description: '',
    location: '',
    headOfUnit: '',
  }
}

// Submit form
const handleSubmit = async () => {
  if (!formData.value.divisionId) {
    alert('Please select a division')
    return
  }
  
  loading.value = true
  try {
    const payload = {
      ...formData.value,
      headOfUnit: formData.value.headOfUnit || null,
    }

    if (isEditMode.value && editingId.value) {
      // Update
      const response = await $fetch<{ success: boolean }>(`/api/units/${editingId.value}`, {
        method: 'PUT',
        body: payload,
      })
      if (response.success) {
        await fetchUnits()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch<{ success: boolean }>('/api/units', {
        method: 'POST',
        body: payload,
      })
      if (response.success) {
        await fetchUnits()
        closeModal()
      }
    }
  } catch (error: any) {
    console.error('Failed to save unit:', error)
    alert(error?.data?.message || 'Failed to save unit')
  } finally {
    loading.value = false
  }
}

// Delete unit
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this unit?')) return

  loading.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/api/units/${id}`, {
      method: 'DELETE',
    })
    if (response.success) {
      await fetchUnits()
    }
  } catch (error: any) {
    console.error('Failed to delete unit:', error)
    alert(error?.data?.message || 'Failed to delete unit')
  } finally {
    loading.value = false
  }
}

// Load data on mount
onMounted(() => {
  fetchUnits()
  fetchSites()
  fetchDivisions()
  fetchEmployees()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Unit Management</h1>
        <p class="text-base-content/70 text-sm mt-1">Manage organizational units</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <Plus :size="20" />
        Add Unit
      </button>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label class="label">
          <span class="label-text">Site</span>
        </label>
        <select
          v-model="filterSiteId"
          @change="handleFilterChange"
          class="select select-bordered w-full"
        >
          <option value="">All Sites</option>
          <option v-for="site in sites" :key="site.id" :value="site.id">
            {{ site.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">
          <span class="label-text">Search</span>
        </label>
        <div class="relative">
          <Search :size="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search units..."
            class="input input-bordered w-full pl-10"
          />
        </div>
      </div>
    </div>

    <!-- Clear Filters -->
    <div class="mb-4" v-if="filterSiteId">
      <button
        @click="() => { filterSiteId = ''; fetchUnits() }"
        class="btn btn-ghost btn-sm"
      >
        Clear Filters
      </button>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Unit Code</th>
                <th>Name</th>
                <th>Site</th>
                <th>Division</th>
                <th>Location</th>
                <th>Head of Unit</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="units.length === 0">
                <td colspan="7" class="text-center py-8 text-base-content/50">No units found</td>
              </tr>
              <tr v-for="unit in units" :key="unit.id" class="hover">
                <td>{{ unit.unitCode }}</td>
                <td class="font-medium">{{ unit.name }}</td>
                <td>{{ unit.siteName || '-' }}</td>
                <td>{{ unit.divisionName || '-' }}</td>
                <td>{{ unit.location || '-' }}</td>
                <td>{{ unit.headOfUnitName || '-' }}</td>
                <td class="text-right">
                  <div class="flex gap-2 justify-end">
                    <button @click="openEditModal(unit)" class="btn btn-sm btn-ghost">
                      <Edit :size="16" />
                    </button>
                    <button @click="handleDelete(unit.id)" class="btn btn-sm btn-ghost text-error">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination Area -->
    <div v-if="totalPages > 0" class="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="text-sm text-base-content/60">
        Showing {{ totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} to {{ Math.min(currentPage * itemsPerPage, totalItems) }} of {{ totalItems }} entries
      </div>
      <div class="join" v-if="totalPages > 1">
        <button 
          @click="handlePageChange(currentPage - 1)" 
          class="join-item btn btn-sm" 
          :disabled="currentPage === 1 || loading"
        >
          Previous
        </button>
        <button 
          v-for="page in displayedPages" 
          :key="page"
          @click="handlePageChange(page)"
          class="join-item btn btn-sm"
          :class="{ 'btn-primary': currentPage === page }"
          :disabled="loading"
        >
          {{ page }}
        </button>
        <button 
          @click="handlePageChange(currentPage + 1)" 
          class="join-item btn btn-sm" 
          :disabled="currentPage === totalPages || loading"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal modal-open">
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditMode ? 'Edit Unit' : 'Add New Unit' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Site -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Site <span class="text-error">*</span></span>
              </label>
              <select v-model="formData.siteId" class="select select-bordered" required>
                <option value="">Select Site</option>
                <option v-for="site in sites" :key="site.id" :value="site.id">
                  {{ site.name }}
                </option>
              </select>
            </div>

            <!-- Unit Code -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Unit Code <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.unitCode"
                type="text"
                placeholder="UNIT001"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Division -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Division <span class="text-error">*</span></span>
              </label>
              <select v-model="formData.divisionId" class="select select-bordered" required>
                <option value="">Select Division</option>
                <option v-for="division in divisions" :key="division.id" :value="division.id">
                  {{ division.name }}
                </option>
              </select>
            </div>

            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="Engineering Unit"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Description -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Description</span>
              </label>
              <textarea
                v-model="formData.description"
                placeholder="Unit description"
                class="textarea textarea-bordered h-24"
              ></textarea>
            </div>

            <!-- Location -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Location</span>
              </label>
              <input
                v-model="formData.location"
                type="text"
                placeholder="Building A, Floor 2"
                class="input input-bordered"
              />
            </div>

            <!-- Head of Unit -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Head of Unit</span>
              </label>
              <div class="dropdown w-full">
                <div class="relative">
                  <input
                    ref="employeeInput"
                    v-model="employeeSearchQuery"
                    type="text"
                    placeholder="Search employee..."
                    class="input input-bordered w-full"
                    @input="handleEmployeeSearch"
                    @focus="() => { if (!employeeSearchQuery) fetchEmployees() }"
                  />
                  <div v-if="employeeLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                    <span class="loading loading-spinner loading-xs"></span>
                  </div>
                </div>
                
                <ul class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto mt-1 border border-base-content/10">
                  <li v-if="employees.length === 0 && !employeeLoading">
                    <a class="text-base-content/50">No employees found</a>
                  </li>
                  <li v-for="employee in employees" :key="employee.id">
                    <button 
                      type="button"
                      @click="() => { 
                        formData.headOfUnit = employee.id; 
                        employeeSearchQuery = employee.fullName;
                        (employeeInput as any)?.blur();
                      }"
                      :class="{ 'active': formData.headOfUnit === employee.id }"
                    >
                      <div class="flex flex-col items-start">
                        <span class="font-medium">{{ employee.fullName }}</span>
                        <span class="text-xs opacity-50">{{ employee.nik }}</span>
                      </div>
                    </button>
                  </li>
                  <li v-if="employeeTotalPages > 1" class="border-t border-base-content/10 mt-2 pt-2">
                    <div class="flex justify-between items-center px-4 py-2">
                      <button 
                        type="button"
                        class="btn btn-xs" 
                        :disabled="employeeCurrentPage === 1 || employeeLoading"
                        @click.stop="fetchEmployees(employeeSearchQuery, employeeCurrentPage - 1)"
                      >«</button>
                      <span class="text-xs">Page {{ employeeCurrentPage }} of {{ employeeTotalPages }}</span>
                      <button 
                        type="button"
                        class="btn btn-xs" 
                        :disabled="employeeCurrentPage === employeeTotalPages || employeeLoading"
                        @click.stop="fetchEmployees(employeeSearchQuery, employeeCurrentPage + 1)"
                      >»</button>
                    </div>
                  </li>
                </ul>
              </div>
              <input type="hidden" v-model="formData.headOfUnit" />
              <label class="label" v-if="formData.headOfUnit">
                <span class="label-text-alt text-success">Selected: {{ employeeSearchQuery }}</span>
                <button type="button" @click="() => { formData.headOfUnit = ''; employeeSearchQuery = ''; fetchEmployees(); }" class="label-text-alt link link-error">Clear</button>
              </label>
            </div>

            <!-- Actions -->
            <div class="modal-action">
              <button type="button" @click="closeModal" class="btn btn-ghost" :disabled="loading">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                {{ isEditMode ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
        <div class="modal-backdrop" @click="closeModal"></div>
      </div>
    </Teleport>
  </div>
</template>
