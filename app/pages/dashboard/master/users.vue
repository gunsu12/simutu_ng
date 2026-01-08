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

interface Employee {
  id: string
  fullName: string
  nik?: string
}

interface User {
  id: string
  name: string
  username: string
  email: string
  role: string
  employeeId: string | null
  siteId: string | null
  createdAt: Date
  updatedAt: Date
  employeeName?: string | null
  siteName?: string | null
}

// State
const users = ref<User[]>([])
const sites = ref<Site[]>([])
const employees = ref<Employee[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const employeeSearchQuery = ref('')
const employeeLoading = ref(false)
const employeeTotalPages = ref(1)
const employeeCurrentPage = ref(1)
const employeeInput = ref<HTMLInputElement | null>(null)

// Main Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// Form data
const formData = ref({
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'user',
  employeeId: '',
  siteId: '',
})

// Fetch users
const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ 
      success: boolean; 
      data: User[];
      meta: { total: number; totalPages: number; page: number; limit: number }
    }>('/api/users', {
      query: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
      }
    })
    if (response.success) {
      users.value = response.data
      totalItems.value = response.meta.total
      totalPages.value = response.meta.totalPages
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

// Handle search with debounce
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const handleSearch = () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    currentPage.value = 1
    fetchUsers()
  }, 500)
}

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchUsers()
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

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin'
    case 'manager': return 'Manajer'
    case 'auditor': return 'Auditor'
    case 'user': return 'Pengguna'
    default: return role
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
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
    employeeId: '',
    siteId: '',
  }
  employeeSearchQuery.value = ''
  fetchEmployees()
  modalOpen.value = true
}

// Open modal for edit
const openEditModal = (user: User) => {
  isEditMode.value = true
  editingId.value = user.id
  formData.value = {
    name: user.name,
    username: user.username,
    email: user.email,
    password: '',
    role: user.role,
    employeeId: user.employeeId || '',
    siteId: user.siteId || '',
  }
  
  // Set employee search query to the selected employee's name if it exists
  employeeSearchQuery.value = user.employeeName || ''
  fetchEmployees(user.employeeName || '')
  
  modalOpen.value = true
}

// Close modal
const closeModal = () => {
  modalOpen.value = false
  formData.value = {
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
    employeeId: '',
    siteId: '',
  }
}

// Submit form
const handleSubmit = async () => {
  loading.value = true
  try {
    if (isEditMode.value && editingId.value) {
      // Update
      const updateData: any = { ...formData.value }
      if (!updateData.password) {
        delete updateData.password
      }
      const response = await $fetch<{ success: boolean }>(`/api/users/${editingId.value}`, {
        method: 'PUT',
        body: updateData,
      })
      if (response.success) {
        await fetchUsers()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch<{ success: boolean }>('/api/users', {
        method: 'POST',
        body: formData.value,
      })
      if (response.success) {
        await fetchUsers()
        closeModal()
      }
    }
  } catch (error: any) {
    console.error('Failed to save user:', error)
    alert(error?.data?.message || 'Gagal menyimpan pengguna')
  } finally {
    loading.value = false
  }
}

// Delete user
const handleDelete = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return

  loading.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
    })
    if (response.success) {
      await fetchUsers()
    }
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    alert(error?.data?.message || 'Gagal menghapus pengguna')
  } finally {
    loading.value = false
  }
}

// Load data on mount
onMounted(() => {
  fetchUsers()
  fetchSites()
  fetchEmployees()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Manajemen Pengguna</h1>
        <p class="text-base-content/70 text-sm mt-1">Kelola pengguna sistem</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <Plus :size="20" />
        Tambah Pengguna
      </button>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <div class="relative">
        <Search :size="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
        <input
          v-model="searchQuery"
          @input="handleSearch"
          type="text"
          placeholder="Cari pengguna..."
          class="input input-bordered w-full pl-10"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Karyawan</th>
                <th>Site</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td colspan="7" class="text-center py-8 text-base-content/50">Pengguna tidak ditemukan</td>
              </tr>
              <tr v-for="user in users" :key="user.id" class="hover">
                <td class="font-medium">{{ user.name }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="badge" :class="{
                    'badge-primary': user.role === 'admin',
                    'badge-secondary': user.role === 'manager',
                    'badge-accent': user.role === 'auditor',
                    'badge-ghost': user.role === 'user',
                  }">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td>{{ user.employeeName || '-' }}</td>
                <td>{{ user.siteName || '-' }}</td>
                <td class="text-right">
                  <div class="flex gap-2 justify-end">
                    <button @click="openEditModal(user)" class="btn btn-sm btn-ghost">
                      <Edit :size="16" />
                    </button>
                    <button @click="handleDelete(user.id)" class="btn btn-sm btn-ghost text-error">
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
        Menampilkan {{ totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} sampai {{ Math.min(currentPage * itemsPerPage, totalItems) }} dari {{ totalItems }} entri
      </div>
      <div class="join" v-if="totalPages > 1">
        <button 
          @click="handlePageChange(currentPage - 1)" 
          class="join-item btn btn-sm" 
          :disabled="currentPage === 1 || loading"
        >
          Sebelumnya
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
          Selanjutnya
        </button>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal modal-open">
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditMode ? 'Ubah Pengguna' : 'Tambah Pengguna Baru' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Nama <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="Nama Lengkap"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Username -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Username <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.username"
                type="text"
                placeholder="username"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Email -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Email <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.email"
                type="email"
                placeholder="email@contoh.com"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Password -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Password {{ !isEditMode ? '*' : '' }} <span v-if="!isEditMode" class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.password"
                type="password"
                placeholder="••••••••"
                class="input input-bordered"
                :required="!isEditMode"
              />
              <label v-if="isEditMode" class="label">
                <span class="label-text-alt">Kosongkan jika tidak ingin mengubah password</span>
              </label>
            </div>

            <!-- Role -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Role <span class="text-error">*</span></span>
              </label>
              <select v-model="formData.role" class="select select-bordered" required>
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="auditor">Auditor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <!-- Employee -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Karyawan</span>
              </label>
              <div class="dropdown w-full">
                <div class="relative">
                  <input
                    ref="employeeInput"
                    v-model="employeeSearchQuery"
                    type="text"
                    placeholder="Cari karyawan..."
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
                    <a class="text-base-content/50">Karyawan tidak ditemukan</a>
                  </li>
                  <li v-for="employee in employees" :key="employee.id">
                    <button 
                      type="button"
                      @click="() => { 
                        formData.employeeId = employee.id; 
                        employeeSearchQuery = employee.fullName;
                        (employeeInput as any)?.blur();
                      }"
                      :class="{ 'active': formData.employeeId === employee.id }"
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
                      <span class="text-xs">Halaman {{ employeeCurrentPage }} dari {{ employeeTotalPages }}</span>
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
              <input type="hidden" v-model="formData.employeeId" />
              <label class="label" v-if="formData.employeeId">
                <span class="label-text-alt text-success">Terpilih: {{ employeeSearchQuery }}</span>
                <button type="button" @click="() => { formData.employeeId = ''; employeeSearchQuery = ''; fetchEmployees(); }" class="label-text-alt link link-error">Hapus</button>
              </label>
            </div>

            <!-- Site -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Site</span>
              </label>
              <select v-model="formData.siteId" class="select select-bordered">
                <option value="">Pilih Site</option>
                <option v-for="site in sites" :key="site.id" :value="site.id">
                  {{ site.name }}
                </option>
              </select>
            </div>

            <!-- Modal actions -->
            <div class="modal-action">
              <button type="button" @click="closeModal" class="btn">Batal</button>
              <button type="submit" class="btn btn-primary">
                {{ isEditMode ? 'Perbarui' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
