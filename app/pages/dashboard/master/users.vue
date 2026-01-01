<script setup lang="ts">
import { UserCog, Plus, Search, Edit, Trash2, Shield, Key } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const searchQuery = ref('')

const users = ref([
  { id: 1, username: 'admin', name: 'Administrator', email: 'admin@simutu.com', role: 'Super Admin', lastLogin: '2 min ago', status: 'active' },
  { id: 2, username: 'dr.andi', name: 'Dr. Andi Wijaya', email: 'andi@simutu.com', role: 'Manager', lastLogin: '1 hour ago', status: 'active' },
  { id: 3, username: 'siti.r', name: 'Siti Rahayu', email: 'siti@simutu.com', role: 'Staff', lastLogin: '3 hours ago', status: 'active' },
  { id: 4, username: 'budi.s', name: 'Budi Santoso', email: 'budi@simutu.com', role: 'Staff', lastLogin: '1 day ago', status: 'inactive' },
  { id: 5, username: 'dewi.l', name: 'Dewi Lestari', email: 'dewi@simutu.com', role: 'Viewer', lastLogin: '2 days ago', status: 'active' }
])

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(user =>
    user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'Super Admin': return 'badge-error'
    case 'Manager': return 'badge-warning'
    case 'Staff': return 'badge-info'
    default: return 'badge-ghost'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">User Management</h1>
        <p class="text-base-content/60 mt-1">Kelola akun pengguna sistem.</p>
      </div>
      <button class="btn btn-primary gap-2">
        <Plus class="w-4 h-4" />
        Tambah User
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
              placeholder="Cari user..."
              class="input input-bordered w-full pl-10"
            />
          </div>
          <select class="select select-bordered w-full sm:w-auto">
            <option selected>Semua Role</option>
            <option>Super Admin</option>
            <option>Manager</option>
            <option>Staff</option>
            <option>Viewer</option>
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
              <th>User</th>
              <th>Username</th>
              <th>Role</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-base-200/30">
              <td>
                <div class="flex items-center gap-3">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-full w-8">
                      <span class="text-xs">{{ user.name.split(' ').map(n => n[0]).slice(0, 2).join('') }}</span>
                    </div>
                  </div>
                  <div>
                    <div class="font-medium">{{ user.name }}</div>
                    <div class="text-sm text-base-content/60">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="font-mono text-sm">{{ user.username }}</td>
              <td>
                <span class="badge badge-sm" :class="getRoleBadgeClass(user.role)">
                  {{ user.role }}
                </span>
              </td>
              <td class="text-base-content/60 text-sm">{{ user.lastLogin }}</td>
              <td>
                <span 
                  class="badge badge-sm"
                  :class="user.status === 'active' ? 'badge-success' : 'badge-error'"
                >
                  {{ user.status }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button class="btn btn-ghost btn-xs btn-square" title="Edit">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button class="btn btn-ghost btn-xs btn-square" title="Reset Password">
                    <Key class="w-4 h-4" />
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
