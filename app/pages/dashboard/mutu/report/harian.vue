<script setup lang="ts">
import { CalendarDays, Download, Filter, CheckCircle, XCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const selectedDate = ref(new Date().toISOString().split('T')[0])

const dailyData = ref([
  { id: 1, time: '08:00', indicator: 'Kepatuhan Cuci Tangan', unit: 'IGD', value: 90, target: 80, status: 'achieved' },
  { id: 2, time: '09:00', indicator: 'Waktu Tunggu', unit: 'Rawat Jalan', value: 55, target: 60, status: 'achieved' },
  { id: 3, time: '10:00', indicator: 'Kelengkapan RM', unit: 'Rawat Inap', value: 88, target: 95, status: 'not-achieved' },
  { id: 4, time: '11:00', indicator: 'Kepatuhan Cuci Tangan', unit: 'Rawat Inap', value: 82, target: 80, status: 'achieved' },
  { id: 5, time: '14:00', indicator: 'Response Time', unit: 'IGD', value: 8, target: 5, status: 'not-achieved' }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Mutu Harian</h1>
        <p class="text-base-content/60 mt-1">Monitoring capaian mutu harian.</p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="selectedDate"
          type="date"
          class="input input-bordered input-sm"
        />
        <button class="btn btn-primary btn-sm gap-2">
          <Download class="w-4 h-4" />
          Export
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Total Pengukuran</p>
          <p class="text-2xl font-bold">{{ dailyData.length }}</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Tercapai</p>
          <p class="text-2xl font-bold text-success">
            {{ dailyData.filter(d => d.status === 'achieved').length }}
          </p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Tidak Tercapai</p>
          <p class="text-2xl font-bold text-error">
            {{ dailyData.filter(d => d.status === 'not-achieved').length }}
          </p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Capaian</p>
          <p class="text-2xl font-bold text-primary">
            {{ ((dailyData.filter(d => d.status === 'achieved').length / dailyData.length) * 100).toFixed(1) }}%
          </p>
        </div>
      </div>
    </div>

    <!-- Daily Log -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>Waktu</th>
              <th>Indikator</th>
              <th>Unit</th>
              <th class="text-center">Target</th>
              <th class="text-center">Aktual</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dailyData" :key="item.id">
              <td class="font-mono">{{ item.time }}</td>
              <td class="font-medium">{{ item.indicator }}</td>
              <td><span class="badge badge-ghost">{{ item.unit }}</span></td>
              <td class="text-center">{{ item.target }}</td>
              <td class="text-center font-bold">{{ item.value }}</td>
              <td class="text-center">
                <CheckCircle v-if="item.status === 'achieved'" class="w-5 h-5 text-success mx-auto" />
                <XCircle v-else class="w-5 h-5 text-error mx-auto" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
