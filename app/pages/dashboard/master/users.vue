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
    const response = await $fetch<{ success: boolean; data: User[] }>('/api/users')
    if (response.success) {
      users.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
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

// Fetch employees
const fetchEmployees = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: Employee[] }>('/api/employees')
    if (response.success) {
      employees.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch employees:', error)
  }
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
      const updateData = { ...formData.value }
      if (!updateData.password) {
        delete updateData.password
      }
      const response = await $fetch(`/api/users/${editingId.value}`, {
        method: 'PUT',
        body: updateData,
      })
      if (response.success) {
        await fetchUsers()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch('/api/users', {
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
    alert(error?.data?.message || 'Failed to save user')
  } finally {
    loading.value = false
  }
}

// Delete user
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this user?')) return

  loading.value = true
  try {
    const response = await $fetch(`/api/users/${id}`, {
      method: 'DELETE',
    })
    if (response.success) {
      await fetchUsers()
    }
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    alert(error?.data?.message || 'Failed to delete user')
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
        <h1 class="text-2xl font-bold">User Management</h1>
        <p class="text-base-content/70 text-sm mt-1">Manage system users</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <Plus :size="20" />
        Add User
      </button>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <div class="relative">
        <Search :size="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search users..."
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
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Employee</th>
                <th>Site</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td colspan="7" class="text-center py-8 text-base-content/50">No users found</td>
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
                    {{ user.role }}
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

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal modal-open">
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditMode ? 'Edit User' : 'Add New User' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="John Doe"
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
                placeholder="johndoe"
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
                placeholder="john@example.com"
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
                <span class="label-text-alt">Leave empty to keep current password</span>
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
                <span class="label-text">Employee</span>
              </label>
              <select v-model="formData.employeeId" class="select select-bordered">
                <option value="">Select Employee</option>
                <option v-for="employee in employees" :key="employee.id" :value="employee.id">
                  {{ employee.fullName }}
                </option>
              </select>
            </div>

            <!-- Site -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Site</span>
              </label>
              <select v-model="formData.siteId" class="select select-bordered">
                <option value="">Select Site</option>
                <option v-for="site in sites" :key="site.id" :value="site.id">
                  {{ site.name }}
                </option>
              </select>
            </div>

            <!-- Modal actions -->
            <div class="modal-action">
              <button type="button" @click="closeModal" class="btn">Cancel</button>
              <button type="submit" class="btn btn-primary">
                {{ isEditMode ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
