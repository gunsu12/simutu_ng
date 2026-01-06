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
  siteId: string | null
  code: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  siteName?: string | null
}

// State
const divisions = ref<Division[]>([])
const sites = ref<Site[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const filterSiteId = ref('')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// Form data
const formData = ref({
  siteId: '',
  code: '',
  name: '',
  description: '',
})

// Fetch divisions
const fetchDivisions = async () => {
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
      data: Division[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/divisions', {
      query: params,
    })
    if (response.success) {
      divisions.value = response.data
      totalItems.value = response.meta.total
      totalPages.value = response.meta.totalPages
    }
  } catch (error) {
    console.error('Failed to fetch divisions:', error)
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
    fetchDivisions()
  }, 500)
})

// Handle filter change
const handleFilterChange = () => {
  currentPage.value = 1
  fetchDivisions()
}

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchDivisions()
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

// Open modal for create
const openCreateModal = () => {
  isEditMode.value = false
  editingId.value = null
  formData.value = {
    siteId: '',
    code: '',
    name: '',
    description: '',
  }
  modalOpen.value = true
}

// Open modal for edit
const openEditModal = (division: Division) => {
  isEditMode.value = true
  editingId.value = division.id
  formData.value = {
    siteId: division.siteId || '',
    code: division.code,
    name: division.name,
    description: division.description || '',
  }
  modalOpen.value = true
}

// Close modal
const closeModal = () => {
  modalOpen.value = false
  formData.value = {
    siteId: '',
    code: '',
    name: '',
    description: '',
  }
}

// Submit form
const handleSubmit = async () => {
  loading.value = true
  try {
    if (isEditMode.value && editingId.value) {
      // Update
      const response = await $fetch<{ success: boolean }>(`/api/divisions/${editingId.value}`, {
        method: 'PUT',
        body: formData.value,
      })
      if (response.success) {
        await fetchDivisions()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch<{ success: boolean }>('/api/divisions', {
        method: 'POST',
        body: formData.value,
      })
      if (response.success) {
        await fetchDivisions()
        closeModal()
      }
    }
  } catch (error: any) {
    console.error('Failed to save division:', error)
    alert(error?.data?.message || 'Failed to save division')
  } finally {
    loading.value = false
  }
}

// Delete division
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this division?')) return

  loading.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/api/divisions/${id}`, {
      method: 'DELETE',
    })
    if (response.success) {
      await fetchDivisions()
    }
  } catch (error: any) {
    console.error('Failed to delete division:', error)
    alert(error?.data?.message || 'Failed to delete division')
  } finally {
    loading.value = false
  }
}

// Load data on mount
onMounted(() => {
  fetchDivisions()
  fetchSites()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Division Management</h1>
        <p class="text-base-content/70 text-sm mt-1">Manage organizational divisions</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <Plus :size="20" />
        Add Division
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
            placeholder="Search divisions..."
            class="input input-bordered w-full pl-10"
          />
        </div>
      </div>
    </div>

    <!-- Clear Filters -->
    <div class="mb-4" v-if="filterSiteId">
      <button
        @click="() => { filterSiteId = ''; fetchDivisions() }"
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
                <th>Code</th>
                <th>Name</th>
                <th>Site</th>
                <th>Description</th>
                <th>Created At</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="divisions.length === 0">
                <td colspan="6" class="text-center py-8 text-base-content/50">No divisions found</td>
              </tr>
              <tr v-for="division in divisions" :key="division.id" class="hover">
                <td>{{ division.code }}</td>
                <td class="font-medium">{{ division.name }}</td>
                <td>{{ division.siteName || '-' }}</td>
                <td>{{ division.description || '-' }}</td>
                <td>{{ new Date(division.createdAt).toLocaleDateString() }}</td>
                <td class="text-right">
                  <div class="flex gap-2 justify-end">
                    <button @click="openEditModal(division)" class="btn btn-sm btn-ghost">
                      <Edit :size="16" />
                    </button>
                    <button @click="handleDelete(division.id)" class="btn btn-sm btn-ghost text-error">
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
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditMode ? 'Edit Division' : 'Add New Division' }}
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

            <!-- Code -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Code <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.code"
                type="text"
                placeholder="DIV001"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="Engineering Division"
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
                placeholder="Division description"
                class="textarea textarea-bordered h-24"
              ></textarea>
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
