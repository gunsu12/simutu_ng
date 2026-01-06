<script setup lang="ts">
import { Search, Plus, Edit, Trash2, Upload } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface Site {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
  siteId?: string
  unitCode?: string
}

interface Employee {
  id: string
  siteId: string | null
  nik: string
  fullName: string
  unitId: string | null
  identityNumber: string | null
  phoneNumber: string | null
  picture: string | null
  createdAt: Date
  updatedAt: Date
  siteName?: string | null
  unitName?: string | null
}

// State
const employees = ref<Employee[]>([])
const sites = ref<Site[]>([])
const units = ref<Unit[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const picturePreview = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const unitSearchQuery = ref('')
const unitLoading = ref(false)
const unitTotalPages = ref(1)
const unitCurrentPage = ref(1)
const unitInput = ref<HTMLInputElement | null>(null)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// Filter state
const filterSiteId = ref('')
const filterUnitId = ref('')

// Form data
const formData = ref({
  siteId: '',
  nik: '',
  fullName: '',
  unitId: '',
  identityNumber: '',
  phoneNumber: '',
})

// Fetch employees with filters
const fetchEmployees = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (filterSiteId.value) params.siteId = filterSiteId.value
    if (filterUnitId.value) params.unitId = filterUnitId.value
    if (searchQuery.value) params.search = searchQuery.value

    const response = await $fetch<{ 
      success: boolean; 
      data: Employee[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/employees', {
      query: params,
    })
    if (response.success) {
      employees.value = response.data
      totalItems.value = response.meta.total
      totalPages.value = response.meta.totalPages
    }
  } catch (error) {
    console.error('Failed to fetch employees:', error)
  } finally {
    loading.value = false
  }
}

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

// Fetch units
const fetchUnits = async (search = '', page = 1) => {
  unitLoading.value = true
  try {
    const params: any = {
      search,
      page,
      limit: 10
    }
    if (formData.value.siteId) params.siteId = formData.value.siteId

    const response = await $fetch<{ 
      success: boolean; 
      data: Unit[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/units', {
      query: params,
    })
    if (response.success) {
      units.value = response.data
      unitTotalPages.value = response.meta.totalPages
      unitCurrentPage.value = response.meta.page
    }
  } catch (error) {
    console.error('Failed to fetch units:', error)
  } finally {
    unitLoading.value = false
  }
}

// Handle unit search with debounce
let unitSearchTimeout: ReturnType<typeof setTimeout> | null = null
const handleUnitSearch = () => {
  if (unitSearchTimeout) clearTimeout(unitSearchTimeout)
  unitSearchTimeout = setTimeout(() => {
    fetchUnits(unitSearchQuery.value)
  }, 500)
}

// Handle filter changes
const handleFilterChange = () => {
  currentPage.value = 1
  fetchEmployees()
}

// Handle search with debounce
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const handleSearch = () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    currentPage.value = 1
    fetchEmployees()
  }, 500)
}

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchEmployees()
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

// Filtered units based on selected site in form
const filteredFormUnits = computed(() => {
  if (!formData.value.siteId) return []
  return units.value.filter((unit) => unit.siteId === formData.value.siteId)
})

// Handle file selection
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      picturePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

// Open modal for create
const openCreateModal = () => {
  isEditMode.value = false
  editingId.value = null
  picturePreview.value = null
  selectedFile.value = null
  formData.value = {
    siteId: '',
    nik: '',
    fullName: '',
    unitId: '',
    identityNumber: '',
    phoneNumber: '',
  }
  unitSearchQuery.value = ''
  fetchUnits()
  modalOpen.value = true
}

// Open modal for edit
const openEditModal = (employee: Employee) => {
  isEditMode.value = true
  editingId.value = employee.id
  picturePreview.value = employee.picture
  selectedFile.value = null
  formData.value = {
    siteId: employee.siteId || '',
    nik: employee.nik,
    fullName: employee.fullName,
    unitId: employee.unitId || '',
    identityNumber: employee.identityNumber || '',
    phoneNumber: employee.phoneNumber || '',
  }
  
  // Set unit search query to the selected unit's name if it exists
  unitSearchQuery.value = employee.unitName || ''
  fetchUnits(employee.unitName || '')
  
  modalOpen.value = true
}

// Close modal
const closeModal = () => {
  modalOpen.value = false
  picturePreview.value = null
  selectedFile.value = null
  formData.value = {
    siteId: '',
    nik: '',
    fullName: '',
    unitId: '',
    identityNumber: '',
    phoneNumber: '',
  }
}

// Submit form
const handleSubmit = async () => {
  loading.value = true
  try {
    const formDataToSend = new FormData()
    formDataToSend.append('siteId', formData.value.siteId)
    formDataToSend.append('nik', formData.value.nik)
    formDataToSend.append('fullName', formData.value.fullName)
    formDataToSend.append('unitId', formData.value.unitId || '')
    formDataToSend.append('identityNumber', formData.value.identityNumber)
    formDataToSend.append('phoneNumber', formData.value.phoneNumber)
    if (selectedFile.value) {
      formDataToSend.append('picture', selectedFile.value)
    }

    if (isEditMode.value && editingId.value) {
      // Update
      const response = await $fetch<{ success: boolean }>(`/api/employees/${editingId.value}`, {
        method: 'PUT',
        body: formDataToSend,
      })
      if (response.success) {
        await fetchEmployees()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch<{ success: boolean }>('/api/employees', {
        method: 'POST',
        body: formDataToSend,
      })
      if (response.success) {
        await fetchEmployees()
        closeModal()
      }
    }
  } catch (error: any) {
    console.error('Failed to save employee:', error)
    alert(error?.data?.message || 'Failed to save employee')
  } finally {
    loading.value = false
  }
}

// Delete employee
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this employee?')) return

  loading.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/api/employees/${id}`, {
      method: 'DELETE',
    })
    if (response.success) {
      await fetchEmployees()
    }
  } catch (error: any) {
    console.error('Failed to delete employee:', error)
    alert(error?.data?.message || 'Failed to delete employee')
  } finally {
    loading.value = false
  }
}

// Watch site change and reset unit
watch(() => formData.value.siteId, () => {
  formData.value.unitId = ''
  unitSearchQuery.value = ''
  fetchUnits()
})

// Load data on mount
onMounted(() => {
  fetchEmployees()
  fetchSites()
  fetchUnits()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Employee Management</h1>
        <p class="text-base-content/70 text-sm mt-1">Manage employees</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <Plus :size="20" />
        Add Employee
      </button>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-4 gap-4 mb-6">
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
          <span class="label-text">Unit</span>
        </label>
        <select
          v-model="filterUnitId"
          @change="handleFilterChange"
          class="select select-bordered w-full"
        >
          <option value="">All Units</option>
          <option v-for="unit in units" :key="unit.id" :value="unit.id">
            {{ unit.name }}
          </option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="label">
          <span class="label-text">Search</span>
        </label>
        <div class="relative">
          <Search :size="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search by NIK, Name, Identity, Phone..."
            class="input input-bordered w-full pl-10"
          />
        </div>
      </div>
    </div>

    <!-- Clear Filters -->
    <div class="mb-4" v-if="filterSiteId || filterUnitId || searchQuery">
      <button
        @click="() => { filterSiteId = ''; filterUnitId = ''; searchQuery = ''; fetchEmployees() }"
        class="btn btn-ghost btn-sm"
      >
        Clear All Filters
      </button>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Site</th>
                <th>Unit</th>
                <th>Contact</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="employees.length === 0">
                <td colspan="5" class="text-center py-8 text-base-content/50">No employees found</td>
              </tr>
              <tr v-for="employee in employees" :key="employee.id" class="hover">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar">
                      <div class="w-16 h-16 rounded-lg">
                        <img v-if="employee.picture" :src="employee.picture" :alt="employee.fullName" />
                        <div v-else class="bg-base-300 flex items-center justify-center w-full h-full">
                          <span class="text-lg font-semibold">{{ employee.fullName.charAt(0) }}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div class="font-semibold">{{ employee.fullName }}</div>
                      <div class="text-sm text-base-content/60">{{ employee.nik }}</div>
                      <div v-if="employee.identityNumber" class="text-xs text-base-content/50">ID: {{ employee.identityNumber }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ employee.siteName || '-' }}</td>
                <td>{{ employee.unitName || '-' }}</td>
                <td>
                  <div v-if="employee.phoneNumber" class="text-sm">{{ employee.phoneNumber }}</div>
                  <div v-else class="text-base-content/50">-</div>
                </td>
                <td class="text-right">
                  <div class="flex gap-2 justify-end">
                    <button @click="openEditModal(employee)" class="btn btn-sm btn-ghost">
                      <Edit :size="16" />
                    </button>
                    <button @click="handleDelete(employee.id)" class="btn btn-sm btn-ghost text-error">
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
            {{ isEditMode ? 'Edit Employee' : 'Add New Employee' }}
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

            <!-- Picture Upload -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Picture</span>
              </label>
              <div class="flex gap-4 items-start">
                <div class="avatar">
                  <div class="w-24 h-24 rounded-lg">
                    <img v-if="picturePreview" :src="picturePreview" alt="Preview" />
                    <div v-else class="bg-base-300 flex items-center justify-center w-full h-full">
                      <Upload :size="32" class="text-base-content/50" />
                    </div>
                  </div>
                </div>
                <div class="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleFileChange"
                    class="file-input file-input-bordered w-full"
                  />
                  <p class="text-sm text-base-content/60 mt-2">Recommended: Square image, max 2MB</p>
                </div>
              </div>
            </div>

            <!-- NIK -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">NIK <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.nik"
                type="text"
                placeholder="EMP001"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Full Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Full Name <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.fullName"
                type="text"
                placeholder="John Doe"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Unit -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Unit</span>
              </label>
              <div class="dropdown w-full">
                <div class="relative">
                  <input
                    ref="unitInput"
                    v-model="unitSearchQuery"
                    type="text"
                    :placeholder="formData.siteId ? 'Search unit...' : 'Select site first'"
                    class="input input-bordered w-full"
                    :disabled="!formData.siteId"
                    @input="handleUnitSearch"
                    @focus="() => { if (!unitSearchQuery && formData.siteId) fetchUnits() }"
                  />
                  <div v-if="unitLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                    <span class="loading loading-spinner loading-xs"></span>
                  </div>
                </div>
                
                <ul v-if="formData.siteId" class="dropdown-content z-[2] menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto mt-1 border border-base-content/10">
                  <li v-if="units.length === 0 && !unitLoading">
                    <a class="text-base-content/50">No units found</a>
                  </li>
                  <li v-for="unit in units" :key="unit.id">
                    <button 
                      type="button"
                      @click="() => { 
                        formData.unitId = unit.id; 
                        unitSearchQuery = unit.name;
                        (unitInput as any)?.blur();
                      }"
                      :class="{ 'active': formData.unitId === unit.id }"
                    >
                      <div class="flex flex-col items-start">
                        <span class="font-medium">{{ unit.name }}</span>
                        <span class="text-xs opacity-50">{{ unit.unitCode }}</span>
                      </div>
                    </button>
                  </li>
                  <li v-if="unitTotalPages > 1" class="border-t border-base-content/10 mt-2 pt-2">
                    <div class="flex justify-between items-center px-4 py-2">
                      <button 
                        type="button"
                        class="btn btn-xs" 
                        :disabled="unitCurrentPage === 1 || unitLoading"
                        @click.stop="fetchUnits(unitSearchQuery, unitCurrentPage - 1)"
                      >«</button>
                      <span class="text-xs">Page {{ unitCurrentPage }} of {{ unitTotalPages }}</span>
                      <button 
                        type="button"
                        class="btn btn-xs" 
                        :disabled="unitCurrentPage === unitTotalPages || unitLoading"
                        @click.stop="fetchUnits(unitSearchQuery, unitCurrentPage + 1)"
                      >»</button>
                    </div>
                  </li>
                </ul>
              </div>
              <input type="hidden" v-model="formData.unitId" />
              <label class="label" v-if="formData.unitId">
                <span class="label-text-alt text-success">Selected: {{ unitSearchQuery }}</span>
                <button type="button" @click="() => { formData.unitId = ''; unitSearchQuery = ''; fetchUnits(); }" class="label-text-alt link link-error">Clear</button>
              </label>
            </div>

            <!-- Identity Number -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Identity Number</span>
              </label>
              <input
                v-model="formData.identityNumber"
                type="text"
                placeholder="1234567890123456"
                class="input input-bordered"
              />
            </div>

            <!-- Phone Number -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Phone Number</span>
              </label>
              <input
                v-model="formData.phoneNumber"
                type="tel"
                placeholder="+62812345678"
                class="input input-bordered"
              />
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
