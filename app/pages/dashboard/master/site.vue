<script setup lang="ts">
import { MapPin, Plus, Search, Edit, Trash2, Globe, Upload, X } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Types
interface Site {
  id: string
  siteCode: string
  name: string
  description?: string | null
  address?: string | null
  email?: string | null
  website?: string | null
  phone?: string | null
  fax?: string | null
  siteLogo?: string | null
  qualityOfficeHeadId?: string | null
  qualityOfficeHeadName?: string | null
  createdAt: Date
  updatedAt: Date
}

interface Employee {
  id: string
  fullName: string
  nik?: string
}

// State
const searchQuery = ref('')
const sites = ref<Site[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedSite = ref<Site | null>(null)

// Employee selection state
const employees = ref<Employee[]>([])
const employeeSearchQuery = ref('')
const employeeLoading = ref(false)
const employeeTotalPages = ref(1)
const employeeCurrentPage = ref(1)
const employeeInput = ref<HTMLInputElement | null>(null)

// Form data
const formData = ref({
  siteCode: '',
  name: '',
  description: '',
  address: '',
  email: '',
  website: '',
  phone: '',
  fax: '',
  qualityOfficeHeadId: '',
  siteLogo: null as File | null,
  oldSiteLogo: '' as string
})

const logoPreview = ref<string | null>(null)

// Computed
const filteredSites = computed(() => {
  if (!searchQuery.value) return sites.value
  return sites.value.filter(site =>
    site.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    site.siteCode.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (site.address && site.address.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
})

// Methods
async function fetchSites() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: Site[] }>('/api/sites')
    if (response.success) {
      sites.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch sites:', error)
  } finally {
    loading.value = false
  }
}

// Fetch employees
async function fetchEmployees(search = '', page = 1) {
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
function handleEmployeeSearch() {
  if (employeeSearchTimeout) clearTimeout(employeeSearchTimeout)
  employeeSearchTimeout = setTimeout(() => {
    fetchEmployees(employeeSearchQuery.value)
  }, 500)
}

function openCreateModal() {
  modalMode.value = 'create'
  selectedSite.value = null
  resetForm()
  employeeSearchQuery.value = ''
  fetchEmployees()
  modalOpen.value = true
}

function openEditModal(site: Site) {
  modalMode.value = 'edit'
  selectedSite.value = site
  formData.value = {
    siteCode: site.siteCode,
    name: site.name,
    description: site.description || '',
    address: site.address || '',
    email: site.email || '',
    website: site.website || '',
    phone: site.phone || '',
    fax: site.fax || '',
    qualityOfficeHeadId: site.qualityOfficeHeadId || '',
    siteLogo: null,
    oldSiteLogo: site.siteLogo || ''
  }
  logoPreview.value = site.siteLogo || null
  employeeSearchQuery.value = site.qualityOfficeHeadName || ''
  fetchEmployees(site.qualityOfficeHeadName || '')
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  resetForm()
}

function resetForm() {
  formData.value = {
    siteCode: '',
    name: '',
    description: '',
    address: '',
    email: '',
    website: '',
    phone: '',
    fax: '',
    qualityOfficeHeadId: '',
    siteLogo: null,
    oldSiteLogo: ''
  }
  logoPreview.value = null
  employeeSearchQuery.value = ''
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    formData.value.siteLogo = target.files[0]
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      logoPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(target.files[0])
  }
}

function removeLogo() {
  formData.value.siteLogo = null
  logoPreview.value = null
  const fileInput = document.getElementById('siteLogo') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

async function handleSubmit() {
  loading.value = true
  try {
    const data = new FormData()
    data.append('siteCode', formData.value.siteCode)
    data.append('name', formData.value.name)
    data.append('description', formData.value.description)
    data.append('address', formData.value.address)
    data.append('email', formData.value.email)
    data.append('website', formData.value.website)
    data.append('phone', formData.value.phone)
    data.append('fax', formData.value.fax)
    data.append('qualityOfficeHeadId', formData.value.qualityOfficeHeadId)
    
    if (formData.value.siteLogo) {
      data.append('siteLogo', formData.value.siteLogo)
    }
    
    if (modalMode.value === 'edit' && formData.value.oldSiteLogo) {
      data.append('oldSiteLogo', formData.value.oldSiteLogo)
    }

    if (modalMode.value === 'create') {
      const response = await $fetch<{ success: boolean; message: string }>('/api/sites', {
        method: 'POST',
        body: data
      })
      
      if (response.success) {
        alert('Site berhasil dibuat!')
      }
    } else {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/sites/${selectedSite.value?.id}`, {
        method: 'PUT',
        body: data
      })
      
      if (response.success) {
        alert('Site berhasil diperbarui!')
      }
    }
    
    closeModal()
    await fetchSites()
  } catch (error: any) {
    console.error('Failed to save site:', error)
    alert(error.data?.message || 'Gagal menyimpan site')
  } finally {
    loading.value = false
  }
}

async function handleDelete(site: Site) {
  if (!confirm(`Apakah Anda yakin ingin menghapus site "${site.name}"?`)) {
    return
  }
  
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/sites/${site.id}`, {
      method: 'DELETE'
    })
    
    if (response.success) {
      alert('Site berhasil dihapus!')
      await fetchSites()
    }
  } catch (error: any) {
    console.error('Failed to delete site:', error)
    alert(error.data?.message || 'Gagal menghapus site')
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchSites()
  fetchEmployees()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Site</h1>
        <p class="text-base-content/60 mt-1">Kelola data lokasi/site rumah sakit.</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary gap-2">
        <Plus class="w-4 h-4" />
        Tambah Site
      </button>
    </div>

    <!-- Search -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="form-control flex-1">
            <div class="input-group">
              <span class="bg-base-200">
                <Search class="w-4 h-4" />
              </span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari berdasarkan nama, kode, atau alamat..."
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sites Table -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else-if="filteredSites.length === 0" class="text-center py-8">
          <MapPin class="w-12 h-12 mx-auto text-base-content/30 mb-2" />
          <p class="text-base-content/60">Tidak ada data site</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Kepala Quality Office</th>
                <th>Alamat</th>
                <th>Kontak</th>
                <th>Logo</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="site in filteredSites" :key="site.id">
                <td>
                  <span class="font-mono text-sm">{{ site.siteCode }}</span>
                </td>
                <td>
                  <div>
                    <div class="font-semibold">{{ site.name }}</div>
                    <div v-if="site.description" class="text-sm text-base-content/60">
                      {{ site.description }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="font-medium">{{ site.qualityOfficeHeadName || '-' }}</div>
                </td>
                <td>
                  <div v-if="site.address" class="text-sm">
                    {{ site.address }}
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
                <td>
                  <div class="space-y-1 text-sm">
                    <div v-if="site.email" class="flex items-center gap-1">
                      <span class="text-base-content/60">Email:</span>
                      <span>{{ site.email }}</span>
                    </div>
                    <div v-if="site.phone" class="flex items-center gap-1">
                      <span class="text-base-content/60">Telp:</span>
                      <span>{{ site.phone }}</span>
                    </div>
                    <div v-if="site.website" class="flex items-center gap-1">
                      <Globe class="w-3 h-3 text-base-content/60" />
                      <a :href="site.website" target="_blank" class="link link-primary">
                        {{ site.website }}
                      </a>
                    </div>
                    <span v-if="!site.email && !site.phone && !site.website" class="text-base-content/40">-</span>
                  </div>
                </td>
                <td>
                  <div v-if="site.siteLogo" class="avatar">
                    <div class="w-12 h-12 rounded">
                      <img :src="site.siteLogo" :alt="site.name" />
                    </div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
                <td>
                  <div class="flex items-center justify-center gap-2">
                    <button @click="openEditModal(site)" class="btn btn-sm btn-ghost gap-2">
                      <Edit class="w-4 h-4" />
                      Ubah
                    </button>
                    <button @click="handleDelete(site)" class="btn btn-sm btn-ghost btn-error gap-2">
                      <Trash2 class="w-4 h-4" />
                      Hapus
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
          <h3 class="font-bold text-lg mb-4 sticky top-0 bg-base-100 pt-2 pb-2 z-10">
            {{ modalMode === 'create' ? 'Tambah Site Baru' : 'Ubah Site' }}
          </h3>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Site Code -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Kode Site <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.siteCode"
                type="text"
                placeholder="SITE001"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Nama Site <span class="text-error">*</span></span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="RS Pusat Jakarta"
                class="input input-bordered"
                required
              />
            </div>
          </div>

          <!-- Quality Office Head -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Kepala Quality Office</span>
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
              
              <ul class="dropdown-content z-[20] menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto mt-1 border border-base-content/10">
                <li v-if="employees.length === 0 && !employeeLoading">
                  <a class="text-base-content/50">Karyawan tidak ditemukan</a>
                </li>
                <li v-for="employee in employees" :key="employee.id">
                  <button 
                    type="button"
                    @click="() => { 
                      formData.qualityOfficeHeadId = employee.id; 
                      employeeSearchQuery = employee.fullName;
                      (employeeInput as any)?.blur();
                    }"
                    :class="{ 'active': formData.qualityOfficeHeadId === employee.id }"
                  >
                    <div class="flex flex-col items-start text-left">
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
                    <span class="text-xs">Hal {{ employeeCurrentPage }} / {{ employeeTotalPages }}</span>
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
            <input type="hidden" v-model="formData.qualityOfficeHeadId" />
            <label class="label" v-if="formData.qualityOfficeHeadId">
              <span class="label-text-alt text-success">Terpilih: {{ employeeSearchQuery }}</span>
              <button type="button" @click="() => { formData.qualityOfficeHeadId = ''; employeeSearchQuery = ''; fetchEmployees(); }" class="label-text-alt link link-error">Hapus</button>
            </label>
          </div>

          <!-- Description -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Deskripsi</span>
            </label>
            <textarea
              v-model="formData.description"
              placeholder="Deskripsi site..."
              class="textarea textarea-bordered"
              rows="2"
            ></textarea>
          </div>

          <!-- Address -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Alamat</span>
            </label>
            <textarea
              v-model="formData.address"
              placeholder="Jl. Sudirman No. 123, Jakarta"
              class="textarea textarea-bordered"
              rows="2"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Email -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input
                v-model="formData.email"
                type="email"
                placeholder="info@site.com"
                class="input input-bordered"
              />
            </div>

            <!-- Website -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Website</span>
              </label>
              <input
                v-model="formData.website"
                type="url"
                placeholder="https://www.site.com"
                class="input input-bordered"
              />
            </div>

            <!-- Phone -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Telepon</span>
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                placeholder="021-1234567"
                class="input input-bordered"
              />
            </div>

            <!-- Fax -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Fax</span>
              </label>
              <input
                v-model="formData.fax"
                type="tel"
                placeholder="021-7654321"
                class="input input-bordered"
              />
            </div>
          </div>

          <!-- Logo Upload -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Logo Site</span>
            </label>
            
            <div v-if="logoPreview" class="mb-2">
              <div class="relative inline-block">
                <img :src="logoPreview" alt="Logo preview" class="w-32 h-32 object-cover rounded-lg" />
                <button
                  type="button"
                  @click="removeLogo"
                  class="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>

            <input
              id="siteLogo"
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="file-input file-input-bordered"
            />
            <label class="label">
              <span class="label-text-alt">Format: JPG, PNG, max 2MB</span>
            </label>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeModal" class="btn btn-ghost" :disabled="loading">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner"></span>
              <span v-else>{{ modalMode === 'create' ? 'Simpan' : 'Perbarui' }}</span>
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" @click="closeModal"></div>
    </div>
    </Teleport>
  </div>
</template>
