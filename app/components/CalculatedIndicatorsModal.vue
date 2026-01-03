<script setup lang="ts">
import { Eye } from 'lucide-vue-next'

interface IndicatorEntryItem {
  id: string
  indicatorId: string
  numeratorValue?: number | null
  denominatorValue?: number | null
  skor?: number | null
  numeratorDenominatorResult?: number | null
  isAlreadyChecked: boolean
  isNeedPDCA: boolean
  notes?: string | null
  indicator?: {
    id: string
    code: string
    judul: string
    numerator?: string | null
    denominator?: string | null
    target?: number | null
    targetUnit?: string | null
    targetKeterangan?: string | null
    targetCalculationFormula?: string | null
    targetWeight?: number | null
  }
}

interface IndicatorEntry {
  id: string
  entryCode: string
  unitId: string
  entryDate: Date
  entryFrequency: '' | 'daily' | 'monthly'
  notes?: string | null
  status: 'proposed' | 'checked' | 'pending' | 'finish'
  createdBy: string
  updatedBy?: string | null
  auditorNotes?: string | null
  unit?: {
    id: string
    name: string
    unitCode: string
  }
  items?: IndicatorEntryItem[]
}

interface Props {
  isOpen: boolean
  selectedEntry: IndicatorEntry | null
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  selectedEntry: null
})

const emit = defineEmits<{
  close: []
  viewDetail: [indicatorId: string]
}>()

// Helper function to check if target is achieved based on target_keterangan
function checkTargetAchievement(
  result: number | null | undefined, 
  target: number | null | undefined, 
  keterangan: string | null | undefined,
  numeratorValue?: number | null,
  denominatorValue?: number | null
): { achieved: boolean; label: string } {
  // Handle special case: if both numerator and denominator are 0, result is 0
  let resultNum: number
  
  if (numeratorValue === 0 && denominatorValue === 0) {
    resultNum = 0
  } else if (result === null || result === undefined || isNaN(Number(result))) {
    return { achieved: false, label: '-' }
  } else {
    resultNum = Number(result)
  }
  
  if (target === null || target === undefined) {
    return { achieved: false, label: '-' }
  }
  
  const targetNum = Number(target)
  
  let achieved = false
  
  switch (keterangan) {
    case '>':
      achieved = resultNum > targetNum
      break
    case '<':
      achieved = resultNum < targetNum
      break
    case '=':
      achieved = resultNum === targetNum
      break
    case '>=':
      achieved = resultNum >= targetNum
      break
    case '<=':
      achieved = resultNum <= targetNum
      break
    default:
      // Default to >= if no keterangan specified
      achieved = resultNum >= targetNum
  }
  
  return { 
    achieved, 
    label: achieved ? 'Tercapai' : 'Tidak Tercapai' 
  }
}
</script>

<template>
  <!-- Calculated Indicators Modal -->
  <div v-if="isOpen && selectedEntry" class="fixed inset-0 z-[9999] overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" @click="emit('close')"></div>
      
      <!-- Modal Content -->
      <div class="relative bg-base-100 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 class="text-xl font-bold mb-4">
          Calculated Indicators - {{ selectedEntry?.entryCode }}
        </h2>
        <p class="text-base-content/60 mb-4">
          Entry Date: {{ selectedEntry?.entryDate ? new Date(selectedEntry.entryDate).toLocaleDateString() : 'N/A' }} - Frequency: {{ selectedEntry?.entryFrequency }} - Status: {{ selectedEntry?.status }}
        </p>

        <div v-if="selectedEntry?.items && selectedEntry.items.length > 0" class="space-y-4">
          <div
            v-for="item in selectedEntry.items"
            :key="item.id"
            class="card bg-base-200 border border-base-300"
          >
            <div class="card-body p-4">
              <!-- Header -->
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="font-bold text-base">{{ item.indicator?.code }} - {{ item.indicator?.judul }}</h4>
                  <p class="text-sm text-base-content/60 mt-1">{{ item.notes || 'No notes' }}</p>
                </div>
                <div class="flex gap-2 items-center">
                  <span v-if="item.isAlreadyChecked" class="badge badge-success">Checked</span>
                  <span v-if="item.isNeedPDCA" class="badge badge-warning">Needs PDCA</span>
                  <button
                    v-if="item.indicator?.id"
                    type="button"
                    class="btn btn-ghost btn-sm btn-square"
                    :title="`View ${item.indicator?.code || 'Indicator'} Details`"
                    @click="emit('viewDetail', item.indicator.id)"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="divider my-2"></div>

              <!-- Formula Definition -->
              <div v-if="item.indicator?.numerator || item.indicator?.denominator" class="mb-4">
                <h5 class="font-semibold text-sm mb-2">Formula Definition:</h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div v-if="item.indicator?.numerator" class="bg-base-300 p-3 rounded">
                    <p class="font-medium mb-1">Numerator:</p>
                    <p class="text-xs">{{ item.indicator.numerator }}</p>
                  </div>
                  <div v-if="item.indicator?.denominator" class="bg-base-300 p-3 rounded">
                    <p class="font-medium mb-1">Denominator:</p>
                    <p class="text-xs">{{ item.indicator.denominator }}</p>
                  </div>
                </div>
              </div>

              <!-- Target Info -->
              <div v-if="item.indicator?.target" class="mb-4">
                <div class="bg-info/10 p-3 rounded border border-info/30 flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium">Target: {{ item.indicator.targetKeterangan || '' }} {{ item.indicator.target }}{{ item.indicator.targetUnit === 'percentage' ? '%' : (item.indicator.targetUnit === 'day' ? ' hari' : '') }}</p>
                    <p v-if="item.indicator.targetCalculationFormula" class="text-xs text-base-content/60 mt-1">Formula: {{ item.indicator.targetCalculationFormula }}</p>
                  </div>
                  <div>
                    <span 
                      :class="[
                        'badge badge-lg',
                        checkTargetAchievement(item.numeratorDenominatorResult, item.indicator.target, item.indicator.targetKeterangan, item.numeratorValue, item.denominatorValue).achieved 
                          ? 'badge-success' 
                          : 'badge-error'
                      ]"
                    >
                      {{ checkTargetAchievement(item.numeratorDenominatorResult, item.indicator.target, item.indicator.targetKeterangan, item.numeratorValue, item.denominatorValue).label }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Calculated Values -->
              <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div class="bg-base-100 p-3 rounded border border-base-300">
                  <p class="text-xs text-base-content/60 mb-1">Numerator Value</p>
                  <p class="text-lg font-bold">{{ item.numeratorValue || '-' }}</p>
                </div>
                <div class="bg-base-100 p-3 rounded border border-base-300">
                  <p class="text-xs text-base-content/60 mb-1">Denominator Value</p>
                  <p class="text-lg font-bold">{{ item.denominatorValue || '-' }}</p>
                </div>
                <div class="bg-base-100 p-3 rounded border border-base-300">
                  <p class="text-xs text-base-content/60 mb-1">Result ({{ item.indicator?.targetCalculationFormula || 'N/D' }})</p>
                  <p class="text-lg font-bold">
                    {{
                      item.numeratorDenominatorResult
                        ? Number(item.numeratorDenominatorResult).toFixed(2) + (item.indicator?.targetUnit === 'percentage' ? '%' : (item.indicator?.targetUnit === 'day' ? ' hari' : ''))
                        : '-'
                    }}
                  </p>
                </div>
                <div class="bg-base-100 p-3 rounded border border-base-300">
                  <p class="text-xs text-base-content/60 mb-1">Skor</p>
                  <p class="text-lg font-bold">{{ item.skor || '-' }}</p>
                </div>
                <div class="bg-base-100 p-3 rounded border border-base-300">
                  <p class="text-xs text-base-content/60 mb-1">Point</p>
                  <p class="text-lg font-bold">{{ item.skor ? item.skor * (item.indicator?.targetWeight || 0) : '-' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>No indicators found for this entry</span>
        </div>

        <div class="flex justify-end mt-6">
          <button
            type="button"
            @click="emit('close')"
            class="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
