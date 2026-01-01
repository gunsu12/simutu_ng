<script setup lang="ts">
import { Search, Plus, Edit, Trash2, FolderOpen, RefreshCw } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

interface IndicatorCategory {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// Use useLazyFetch for better performance - non-blocking
const { data: categoriesData, pending: loading, error, refresh } = useLazyFetch<{
  success: boolean
  data: IndicatorCategory[]
}>('/api/indicator-categories', {
  default: () => ({ success: false, data: [] })
})

const categories = computed(() => categoriesData.value?.data || [])

const searchQuery = ref('')
const showModal = ref(false)
const isEditing = ref(false)
const currentCategory = ref<IndicatorCategory | null>(null)
const saving = ref(false)
const errorMessage = ref('')

// Form data
const form = ref({
  name: '',
  description: ''
})

const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  
  const query = searchQuery.value.toLowerCase()
  return categories.value.filter(cat => 
    cat.name.toLowerCase().includes(query) ||
    cat.description?.toLowerCase().includes(query)
  )
})

const openCreateModal = () => {
  isEditing.value = false
  currentCategory.value = null
  form.value = {
    name: '',
    description: ''
  }
  errorMessage.value = ''
  showModal.value = true
}

const openEditModal = (category: IndicatorCategory) => {
  isEditing.value = true
  currentCategory.value = category
  form.value = {
    name: category.name,
    description: category.description || ''
  }
  errorMessage.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  form.value = {
    name: '',
    description: ''
  }
  errorMessage.value = ''
}

const saveCategory = async () => {
  if (!form.value.name.trim()) {
    errorMessage.value = 'Name is required'
    return
  }

  saving.value = true
  errorMessage.value = ''
  
  try {
    if (isEditing.value && currentCategory.value) {
      const response = await $fetch<{ success: boolean; message?: string }>(`/api/indicator-categories/${currentCategory.value.id}`, {
        method: 'PUT',
        body: form.value
      })
      if (response.success) {
        await refresh()
        closeModal()
      } else {
        errorMessage.value = response.message || 'Failed to update category'
      }
    } else {
      const response = await $fetch<{ success: boolean; message?: string }>('/api/indicator-categories', {
        method: 'POST',
        body: form.value
      })
      if (response.success) {
        await refresh()
        closeModal()
      } else {
        errorMessage.value = response.message || 'Failed to create category'
      }
    }
  } catch (err: any) {
    console.error('Error saving category:', err)
    errorMessage.value = err.data?.message || err.message || 'An error occurred'
  } finally {
    saving.value = false
  }
}

const deleteCategory = async (id: string) => {
  if (!confirm('Are you sure you want to delete this category? This will also delete all indicators in this category.')) return
  
  try {
    const response = await $fetch(`/api/indicator-categories/${id}`, {
      method: 'DELETE'
    })
    if (response.success) {
      await refresh()
    }
  } catch (err: any) {
    console.error('Error deleting category:', err)
    alert(err.data?.message || 'Failed to delete category')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Indicator Categories</h1>
        <p class="text-base-content/60 mt-1">Manage quality indicator categories</p>
      </div>
      <div class="flex gap-2">
        <button @click="refresh()" class="btn btn-ghost btn-sm gap-2" :disabled="loading">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button @click="openCreateModal" class="btn btn-primary gap-2">
          <Plus class="w-4 h-4" />
          Add Category
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-error">
      <span>{{ error.message || 'Failed to load categories' }}</span>
      <button @click="refresh()" class="btn btn-sm">Retry</button>
    </div>

    <!-- Search -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-4">
        <div class="flex items-center gap-2">
          <Search class="w-5 h-5 text-base-content/50" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search categories..."
            class="input input-sm input-bordered flex-1"
          />
        </div>
      </div>
    </div>

    <!-- Categories List -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-0">
        <div v-if="loading" class="flex justify-center items-center p-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="filteredCategories.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
          <FolderOpen class="w-16 h-16 text-base-content/20 mb-4" />
          <p class="text-base-content/60">
            {{ searchQuery ? 'No categories found' : 'No categories yet' }}
          </p>
          <button v-if="!searchQuery" @click="openCreateModal" class="btn btn-primary btn-sm mt-4">
            <Plus class="w-4 h-4" />
            Create First Category
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created At</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in filteredCategories" :key="category.id">
                <td class="font-medium">{{ category.name }}</td>
                <td>{{ category.description || '-' }}</td>
                <td>{{ new Date(category.createdAt).toLocaleDateString() }}</td>
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      @click="openEditModal(category)"
                      class="btn btn-ghost btn-sm btn-square"
                      title="Edit"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click="deleteCategory(category.id)"
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

    <!-- Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showModal }]">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditing ? 'Edit Category' : 'Add New Category' }}
          </h3>

          <!-- Error Message -->
          <div v-if="errorMessage" class="alert alert-error mb-4">
            <span>{{ errorMessage }}</span>
          </div>

          <form @submit.prevent="saveCategory" class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name <span class="text-error">*</span></span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Category name"
                class="input input-bordered"
                required
                :disabled="saving"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Description</span>
              </label>
              <textarea
                v-model="form.description"
                placeholder="Category description"
                class="textarea textarea-bordered h-24"
                :disabled="saving"
              ></textarea>
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
  </div>
</template>
