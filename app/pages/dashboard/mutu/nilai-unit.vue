<script setup lang="ts">
import { Calculator, Search, Save, Filter } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const selectedMonth = ref('2026-01')
const selectedUnit = ref('')

const units = [
  { id: 1, name: 'IGD' },
  { id: 2, name: 'Rawat Inap' },
  { id: 3, name: 'Rawat Jalan' },
  { id: 4, name: 'Laboratorium' },
  { id: 5, name: 'Radiologi' }
]

const mutuData = ref([
  { id: 1, indicator: 'Kepatuhan Cuci Tangan', target: 80, value: 85, unit: '%' },
  { id: 2, indicator: 'Waktu Tunggu', target: 60, value: 45, unit: 'menit' },
  { id: 3, indicator: 'Kepuasan Pasien', target: 85, value: 88, unit: '%' },
  { id: 4, indicator: 'Kelengkapan RM', target: 95, value: 92, unit: '%' }
])

const getAchievementClass = (target: number, value: number, unit: string) => {
  const percentage = unit === 'menit' ? (target / value) * 100 : (value / target) * 100
  if (percentage >= 100) return 'text-success'
  if (percentage >= 80) return 'text-warning'
  return 'text-error'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Nilai Mutu Unit</h1>
        <p class="text-base-content/60 mt-1">Input dan kelola nilai mutu per unit.</p>
      </div>
      <button class="btn btn-primary gap-2">
        <Save class="w-4 h-4" />
        Simpan Data
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="form-control flex-1">
            <label class="label">
              <span class="label-text font-medium">Periode</span>
            </label>
            <input
              v-model="selectedMonth"
              type="month"
              class="input input-bordered"
            />
          </div>
          <div class="form-control flex-1">
            <label class="label">
              <span class="label-text font-medium">Unit</span>
            </label>
            <select v-model="selectedUnit" class="select select-bordered">
              <option value="">Pilih Unit</option>
              <option v-for="unit in units" :key="unit.id" :value="unit.id">
                {{ unit.name }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">&nbsp;</span>
            </label>
            <button class="btn btn-outline gap-2">
              <Filter class="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Table -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead class="bg-base-200/50">
              <tr>
                <th>Indikator Mutu</th>
                <th class="text-center">Target</th>
                <th class="text-center">Nilai Aktual</th>
                <th class="text-center">Capaian</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in mutuData" :key="item.id">
                <td class="font-medium">{{ item.indicator }}</td>
                <td class="text-center">{{ item.target }} {{ item.unit }}</td>
                <td class="text-center">
                  <input
                    v-model.number="item.value"
                    type="number"
                    class="input input-bordered input-sm w-24 text-center"
                  />
                </td>
                <td class="text-center">
                  <span 
                    class="font-bold"
                    :class="getAchievementClass(item.target, item.value, item.unit)"
                  >
                    {{ item.unit === 'menit' 
                      ? ((item.target / item.value) * 100).toFixed(1) 
                      : ((item.value / item.target) * 100).toFixed(1) 
                    }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
