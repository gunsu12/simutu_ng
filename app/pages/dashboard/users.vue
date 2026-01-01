<script setup lang="ts">
import { Search, Plus, MoreHorizontal, Mail, Phone } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const searchQuery = ref('')

const users = ref([
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', avatar: null, lastActive: '2 min ago' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', status: 'active', avatar: null, lastActive: '15 min ago' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'User', status: 'inactive', avatar: null, lastActive: '2 days ago' },
  { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'User', status: 'active', avatar: null, lastActive: '1 hour ago' },
  { id: 5, name: 'Tom Brown', email: 'tom@example.com', role: 'Manager', status: 'pending', avatar: null, lastActive: 'Never' },
  { id: 6, name: 'Emily Davis', email: 'emily@example.com', role: 'User', status: 'active', avatar: null, lastActive: '30 min ago' }
])

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(user => 
    user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return 'badge-success'
    case 'inactive': return 'badge-error'
    case 'pending': return 'badge-warning'
    default: return 'badge-ghost'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Users</h1>
        <p class="text-base-content/60 mt-1">Manage your team members and their account permissions.</p>
      </div>
      <button class="btn btn-primary gap-2">
        <Plus class="w-4 h-4" />
        Add User
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search users..."
              class="input input-bordered w-full pl-10"
            />
          </div>
          <select class="select select-bordered w-full sm:w-auto">
            <option selected>All Roles</option>
            <option>Admin</option>
            <option>Manager</option>
            <option>User</option>
          </select>
          <select class="select select-bordered w-full sm:w-auto">
            <option selected>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Pending</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>
                <label>
                  <input type="checkbox" class="checkbox checkbox-sm" />
                </label>
              </th>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-base-200/30">
              <td>
                <label>
                  <input type="checkbox" class="checkbox checkbox-sm" />
                </label>
              </td>
              <td>
                <div class="flex items-center gap-3">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-full w-10">
                      <span>{{ user.name.split(' ').map(n => n[0]).join('') }}</span>
                    </div>
                  </div>
                  <div>
                    <div class="font-medium">{{ user.name }}</div>
                    <div class="text-sm text-base-content/60">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge badge-ghost">{{ user.role }}</span>
              </td>
              <td>
                <span class="badge badge-sm" :class="getStatusBadge(user.status)">
                  {{ user.status }}
                </span>
              </td>
              <td class="text-base-content/60">{{ user.lastActive }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <button class="btn btn-ghost btn-xs btn-square" title="Send Email">
                    <Mail class="w-4 h-4" />
                  </button>
                  <div class="dropdown dropdown-end">
                    <button tabindex="0" class="btn btn-ghost btn-xs btn-square">
                      <MoreHorizontal class="w-4 h-4" />
                    </button>
                    <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-40 border border-base-300">
                      <li><a>View Profile</a></li>
                      <li><a>Edit User</a></li>
                      <li><a class="text-error">Delete</a></li>
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="flex items-center justify-between p-4 border-t border-base-300">
        <p class="text-sm text-base-content/60">
          Showing 1 to {{ filteredUsers.length }} of {{ users.length }} results
        </p>
        <div class="join">
          <button class="join-item btn btn-sm">«</button>
          <button class="join-item btn btn-sm btn-active">1</button>
          <button class="join-item btn btn-sm">2</button>
          <button class="join-item btn btn-sm">3</button>
          <button class="join-item btn btn-sm">»</button>
        </div>
      </div>
    </div>
  </div>
</template>
