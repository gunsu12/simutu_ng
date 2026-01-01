<script setup lang="ts">
import { FileText, Download, Calendar, Filter, TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const reports = [
  { id: 1, name: 'Monthly Sales Report', type: 'Sales', date: 'Dec 2025', size: '2.4 MB', status: 'completed' },
  { id: 2, name: 'User Analytics Report', type: 'Analytics', date: 'Dec 2025', size: '1.8 MB', status: 'completed' },
  { id: 3, name: 'Financial Summary Q4', type: 'Finance', date: 'Dec 2025', size: '3.2 MB', status: 'processing' },
  { id: 4, name: 'Inventory Status Report', type: 'Inventory', date: 'Nov 2025', size: '1.1 MB', status: 'completed' },
  { id: 5, name: 'Customer Feedback Analysis', type: 'Analytics', date: 'Nov 2025', size: '890 KB', status: 'completed' }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return 'badge-success'
    case 'processing': return 'badge-warning'
    case 'failed': return 'badge-error'
    default: return 'badge-ghost'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Sales': return DollarSign
    case 'Analytics': return TrendingUp
    case 'Finance': return DollarSign
    case 'Inventory': return ShoppingCart
    default: return FileText
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Reports</h1>
        <p class="text-base-content/60 mt-1">View and download your generated reports.</p>
      </div>
      <button class="btn btn-primary gap-2">
        <FileText class="w-4 h-4" />
        Generate New Report
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 flex-row items-center gap-4">
          <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText class="w-6 h-6 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-bold">24</p>
            <p class="text-sm text-base-content/60">Total Reports</p>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 flex-row items-center gap-4">
          <div class="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
            <Download class="w-6 h-6 text-success" />
          </div>
          <div>
            <p class="text-2xl font-bold">156</p>
            <p class="text-sm text-base-content/60">Downloads</p>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4 flex-row items-center gap-4">
          <div class="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
            <Calendar class="w-6 h-6 text-warning" />
          </div>
          <div>
            <p class="text-2xl font-bold">3</p>
            <p class="text-sm text-base-content/60">Scheduled</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Reports Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-0">
        <div class="flex items-center justify-between p-4 border-b border-base-300">
          <h2 class="font-semibold">Recent Reports</h2>
          <button class="btn btn-ghost btn-sm gap-2">
            <Filter class="w-4 h-4" />
            Filter
          </button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="table">
            <thead class="bg-base-200/50">
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Date</th>
                <th>Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in reports" :key="report.id" class="hover:bg-base-200/30">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-base-200 rounded-lg flex items-center justify-center">
                      <component :is="getTypeIcon(report.type)" class="w-5 h-5 text-base-content/70" />
                    </div>
                    <span class="font-medium">{{ report.name }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge badge-ghost">{{ report.type }}</span>
                </td>
                <td class="text-base-content/60">{{ report.date }}</td>
                <td class="text-base-content/60">{{ report.size }}</td>
                <td>
                  <span class="badge badge-sm" :class="getStatusBadge(report.status)">
                    {{ report.status }}
                  </span>
                </td>
                <td>
                  <button 
                    class="btn btn-ghost btn-sm gap-2"
                    :disabled="report.status !== 'completed'"
                  >
                    <Download class="w-4 h-4" />
                    Download
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
