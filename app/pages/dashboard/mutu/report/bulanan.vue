<script setup lang="ts">
import { Calendar, Download, Filter, TrendingUp, TrendingDown } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const selectedMonth = ref('2026-01')

const reportData = ref([
  { unit: 'IGD', indicators: 5, achieved: 4, percentage: 80 },
  { unit: 'Rawat Inap', indicators: 8, achieved: 7, percentage: 87.5 },
  { unit: 'Rawat Jalan', indicators: 6, achieved: 5, percentage: 83.3 },
  { unit: 'Laboratorium', indicators: 4, achieved: 4, percentage: 100 },
  { unit: 'Radiologi', indicators: 3, achieved: 2, percentage: 66.7 }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Mutu Bulanan</h1>
        <p class="text-base-content/60 mt-1">Rekap capaian mutu per bulan.</p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="selectedMonth"
          type="month"
          class="input input-bordered input-sm"
        />
        <button class="btn btn-primary btn-sm gap-2">
          <Download class="w-4 h-4" />
          Export
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Total Indikator</p>
          <p class="text-2xl font-bold">26</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Tercapai</p>
          <p class="text-2xl font-bold text-success">22</p>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <p class="text-sm text-base-content/60">Persentase Capaian</p>
          <p class="text-2xl font-bold text-primary">84.6%</p>
        </div>
      </div>
    </div>

    <!-- Report Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>Unit</th>
              <th class="text-center">Jumlah Indikator</th>
              <th class="text-center">Tercapai</th>
              <th class="text-center">Persentase</th>
              <th class="text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reportData" :key="item.unit">
              <td class="font-medium">{{ item.unit }}</td>
              <td class="text-center">{{ item.indicators }}</td>
              <td class="text-center">{{ item.achieved }}</td>
              <td class="text-center">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-24 bg-base-200 rounded-full h-2">
                    <div 
                      class="h-2 rounded-full"
                      :class="item.percentage >= 80 ? 'bg-success' : item.percentage >= 60 ? 'bg-warning' : 'bg-error'"
                      :style="{ width: `${item.percentage}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium">{{ item.percentage }}%</span>
                </div>
              </td>
              <td class="text-center">
                <TrendingUp v-if="item.percentage >= 80" class="w-4 h-4 text-success mx-auto" />
                <TrendingDown v-else class="w-4 h-4 text-error mx-auto" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
