<script setup lang="ts">
import { Search, Plus, Edit, Trash2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
})

interface Division {
  id: string
  name: string
}

interface Employee {
  id: string
  fullName: string
}

interface Unit {
  id: string
  unitCode: string
  divisionId: string | null
  name: string
  description: string | null
  location: string | null
  headOfUnit: string | null
  createdAt: Date
  updatedAt: Date
  divisionName?: string | null
  headOfUnitName?: string | null
}

// State
const units = ref<Unit[]>([])
const divisions = ref<Division[]>([])
const employees = ref<Employee[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')

// Form data
const formData = ref({
  unitCode: '',
  divisionId: '',
  name: '',
  description: '',
  location: '',
  headOfUnit: '',
})

// Computed
const filteredUnits = computed(() => {
  if (!searchQuery.value) return units.value
  const query = searchQuery.value.toLowerCase()
  return units.value.filter(
    (unit) =>
      unit.unitCode.toLowerCase().includes(query) ||
      unit.name.toLowerCase().includes(query) ||
      (unit.divisionName && unit.divisionName.toLowerCase().includes(query)) ||
      (unit.location && unit.location.toLowerCase().includes(query))
  )
})

// Fetch units
const fetchUnits = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: Unit[] }>('/api/units')
    if (response.success) {
      units.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch units:', error)
  } finally {
    loading.value = false
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
    unitCode: '',
    divisionId: '',
    name: '',
    description: '',
    location: '',
    headOfUnit: '',
  }
  modalOpen.value = true
}

// Open modal for edit
const openEditModal = (unit: Unit) => {
  isEditMode.value = true
  editingId.value = unit.id
  formData.value = {
    unitCode: unit.unitCode,
    divisionId: unit.divisionId || '',
    name: unit.name,
    description: unit.description || '',
    location: unit.location || '',
    headOfUnit: unit.headOfUnit || '',
  }
  modalOpen.value = true
}

// Close modal
const closeModal = () => {
  modalOpen.value = false
  formData.value = {
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
      const response = await $fetch(`/api/units/${editingId.value}`, {
        method: 'PUT',
        body: payload,
      })
      if (response.success) {
        await fetchUnits()
        closeModal()
      }
    } else {
      // Create
      const response = await $fetch('/api/units', {
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
    const response = await $fetch(`/api/units/${id}`, {
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

    <!-- Search -->
    <div class="mb-4">
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

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Unit Code</th>
                <th>Name</th>
                <th>Division</th>
                <th>Location</th>
                <th>Head of Unit</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-8">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="filteredUnits.length === 0">
                <td colspan="6" class="text-center py-8 text-base-content/50">No units found</td>
              </tr>
              <tr v-for="unit in filteredUnits" :key="unit.id" class="hover">
                <td>{{ unit.unitCode }}</td>
                <td class="font-medium">{{ unit.name }}</td>
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

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal modal-open">
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditMode ? 'Edit Unit' : 'Add New Unit' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
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
              <select v-model="formData.headOfUnit" class="select select-bordered">
                <option value="">Select Employee</option>
                <option v-for="employee in employees" :key="employee.id" :value="employee.id">
                  {{ employee.fullName }}
                </option>
              </select>
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
