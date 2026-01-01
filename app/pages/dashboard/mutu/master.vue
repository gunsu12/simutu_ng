<script setup lang="ts">
import { ClipboardList, Plus, Search, Edit, Trash2, MoreHorizontal } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const searchQuery = ref('')

const mutuItems = ref([
  { id: 1, code: 'MUT-001', name: 'Kepatuhan Cuci Tangan', category: 'Klinis', target: 80, unit: '%', status: 'active' },
  { id: 2, code: 'MUT-002', name: 'Waktu Tunggu Rawat Jalan', category: 'Layanan', target: 60, unit: 'menit', status: 'active' },
  { id: 3, code: 'MUT-003', name: 'Kepuasan Pasien', category: 'Survei', target: 85, unit: '%', status: 'active' },
  { id: 4, code: 'MUT-004', name: 'Angka Infeksi Nosokomial', category: 'Klinis', target: 2, unit: '%', status: 'inactive' },
  { id: 5, code: 'MUT-005', name: 'Kelengkapan Rekam Medis', category: 'Administrasi', target: 95, unit: '%', status: 'active' }
])

const filteredItems = computed(() => {
  if (!searchQuery.value) return mutuItems.value
  return mutuItems.value.filter(item =>
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Master Mutu</h1>
        <p class="text-base-content/60 mt-1">Kelola indikator mutu rumah sakit.</p>
      </div>
      <button class="btn btn-primary gap-2">
        <Plus class="w-4 h-4" />
        Tambah Indikator
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari indikator mutu..."
              class="input input-bordered w-full pl-10"
            />
          </div>
          <select class="select select-bordered w-full sm:w-auto">
            <option selected>Semua Kategori</option>
            <option>Klinis</option>
            <option>Layanan</option>
            <option>Survei</option>
            <option>Administrasi</option>
          </select>
          <select class="select select-bordered w-full sm:w-auto">
            <option selected>Semua Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>Kode</th>
              <th>Nama Indikator</th>
              <th>Kategori</th>
              <th>Target</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-base-200/30">
              <td class="font-mono text-sm">{{ item.code }}</td>
              <td class="font-medium">{{ item.name }}</td>
              <td><span class="badge badge-ghost">{{ item.category }}</span></td>
              <td>{{ item.target }} {{ item.unit }}</td>
              <td>
                <span 
                  class="badge badge-sm"
                  :class="item.status === 'active' ? 'badge-success' : 'badge-error'"
                >
                  {{ item.status }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button class="btn btn-ghost btn-xs btn-square" title="Edit">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button class="btn btn-ghost btn-xs btn-square text-error" title="Delete">
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
</template>
