<script setup lang="ts">
import { Search, Plus, Edit, Trash2, Upload } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
})

interface Unit {
  id: string
  name: string
}

interface Employee {
  id: string
  nik: string
  fullName: string
  unitId: string | null
  identityNumber: string | null
  phoneNumber: string | null
  picture: string | null
  createdAt: Date
  updatedAt: Date
  unitName?: string | null
}

// State
const employees = ref<Employee[]>([])
const units = ref<Unit[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const picturePreview = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

// Form data
const formData = ref({
  nik: '',
  fullName: '',
  unitId: '',
  identityNumber: '',
  phoneNumber: '',
})

// Computed
const filteredEmployees = computed(() => {
  if (!searchQuery.value) return employees.value
  const query = searchQuery.value.toLowerCase()
  return employees.value.filter(
    (employee) =>
      employee.nik.toLowerCase().includes(query) ||
      employee.fullName.toLowerCase().includes(query) ||
      (employee.unitName && employee.unitName.toLowerCase().includes(query))
  )
})

// Fetch employees
const fetchEmployees = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: Employee[] }>('/api/employees')
    if (response.success) {
      employees.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch employees:', error)
  } finally {
    loading.value = false
  }
}

// Fetch units
const fetchUnits = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: Unit[] }>('/api/units')
    if (response.success) {
      units.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch units:', error)
  }
}

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
    nik: '',
    fullName: '',
    unitId: '',
    identityNumber: '',
    phoneNumber: '',
  }
  modalOpen.value = true
}

// Open modal for edit
const openEditModal = (employee: Employee) => {
  isEditMode.value = true
  editingId.value = employee.id
  picturePreview.value = employee.picture
  selectedFile.value = null
  formData.value = {
    nik: employee.nik,
    fullName: employee.fullName,
    unitId: employee.unitId || '',
    identityNumber: employee.identityNumber || '',
    phoneNumber: employee.phoneNumber || '',
  }
  modalOpen.value = true
}

// Close modal
const closeModal = () => {
  modalOpen.value = false
  picturePreview.value = null
  selectedFile.value = null
  formData.value = {
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
      const response = await $fetch(`/api/employees/${editingId.value}`, {
        method: 'PUT',
        body: formDataToSend,
      })
      if (response.success) {
        await fetchEmployees()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch('/api/employees', {
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
    const response = await $fetch(`/api/employees/${id}`, {
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

// Load data on mount
onMounted(() => {
  fetchEmployees()
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

    <!-- Search -->
    <div class="mb-4">
      <div class="relative">
        <Search :size="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search employees..."
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
                <th>Picture</th>
                <th>NIK</th>
                <th>Full Name</th>
                <th>Unit</th>
                <th>Identity Number</th>
                <th>Phone Number</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="filteredEmployees.length === 0">
                <td colspan="7" class="text-center py-8 text-base-content/50">No employees found</td>
              </tr>
              <tr v-for="employee in filteredEmployees" :key="employee.id" class="hover">
                <td>
                  <div class="avatar">
                    <div class="w-10 h-10 rounded-full">
                      <img v-if="employee.picture" :src="employee.picture" :alt="employee.fullName" />
                      <div v-else class="bg-base-300 flex items-center justify-center w-full h-full">
                        <span class="text-xs">{{ employee.fullName.charAt(0) }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>{{ employee.nik }}</td>
                <td class="font-medium">{{ employee.fullName }}</td>
                <td>{{ employee.unitName || '-' }}</td>
                <td>{{ employee.identityNumber || '-' }}</td>
                <td>{{ employee.phoneNumber || '-' }}</td>
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

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal modal-open">
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditMode ? 'Edit Employee' : 'Add New Employee' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
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
              <select v-model="formData.unitId" class="select select-bordered">
                <option value="">Select Unit</option>
                <option v-for="unit in units" :key="unit.id" :value="unit.id">
                  {{ unit.name }}
                </option>
              </select>
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
