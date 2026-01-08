<script setup lang="ts">
import { Edit, X } from 'lucide-vue-next'

interface Indicator {
  id: string
  siteId: string
  indicatorCategoryId: string
  categoryName: string
  code: string
  judul: string
  dimensiMutu: string | null
  tujuan: string | null
  definisiOperasional: string | null
  formula: string | null
  numerator: string | null
  denominator: string | null
  target: number | null
  targetUnit: string | null
  targetKeterangan: string | null
  targetIsZero: boolean
  targetCalculationFormula: string | null
  documentFile: string | null
  entryFrequency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Props {
  indicatorId: string
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  edit: [indicator: Indicator]
}>()

const indicator = ref<Indicator | null>(null)
const loading = ref(false)
const error = ref('')

// Fetch indicator data
const fetchIndicator = async () => {
  if (!props.indicatorId) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await $fetch<{ success: boolean; data: Indicator }>(`/api/indicators/${props.indicatorId}`)
    if (response.success) {
      console.log(response.data)
      indicator.value = response.data
    } else {
      error.value = 'Gagal memuat indikator'
    }
  } catch (err: any) {
    console.error('Error fetching indicator:', err)
    error.value = err.data?.message || 'Gagal memuat indikator'
  } finally {
    loading.value = false
  }
}

// Watch for indicatorId changes and fetch data
watch(() => props.indicatorId, () => {
  if (props.isOpen && props.indicatorId) {
    fetchIndicator()
  }
}, { immediate: true })

// Watch for modal open/close
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.indicatorId) {
    fetchIndicator()
  }
})

const closeModal = () => {
  emit('close')
  indicator.value = null
}

const handleEdit = () => {
  if (indicator.value) {
    emit('edit', indicator.value)
  }
}

const formatTarget = (ind: Indicator) => {
  if (!ind.target) return '-'
  const unit = ind.targetUnit === 'percentage' ? '%' : ind.targetUnit === 'day' ? ' hari' : ''
  const comparison = ind.targetKeterangan || ''
  return `${comparison} ${ind.target}${unit}`
}
</script>

<template>
  <Teleport to="body">
    <dialog :class="['modal', { 'modal-open': isOpen }]" :open="isOpen" style="z-index: 10000">
      <div class="modal-box max-w-3xl">
        <button type="button" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">✕</button>
        <h3 class="font-bold text-lg mb-4">Detail Indikator</h3>
        
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-error mb-4">
          <span>{{ error }}</span>
        </div>

        <!-- Content -->
        <div v-else-if="indicator" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-base-content/60">Kode</label>
              <p class="font-mono font-medium">{{ indicator.code }}</p>
            </div>
            <div>
              <label class="text-sm text-base-content/60">Kategori</label>
              <p class="font-medium">{{ indicator.categoryName }}</p>
            </div>
          </div>

          <div>
            <label class="text-sm text-base-content/60">Judul</label>
            <p class="font-medium">{{ indicator.judul }}</p>
          </div>

          <div v-if="indicator.dimensiMutu">
            <label class="text-sm text-base-content/60">Dimensi Mutu</label>
            <p>{{ indicator.dimensiMutu }}</p>
          </div>

          <div v-if="indicator.tujuan">
            <label class="text-sm text-base-content/60">Tujuan</label>
            <p class="whitespace-pre-wrap">{{ indicator.tujuan }}</p>
          </div>

          <div v-if="indicator.definisiOperasional">
            <label class="text-sm text-base-content/60">Definisi Operasional</label>
            <p class="whitespace-pre-wrap">{{ indicator.definisiOperasional }}</p>
          </div>

          <div class="divider">Formula & Target</div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="text-sm text-base-content/60">Numerator</label>
              <p>{{ indicator.numerator || '-' }}</p>
            </div>
            <div>
              <label class="text-sm text-base-content/60">Denominator</label>
              <p>{{ indicator.denominator || '-' }}</p>
            </div>
            <div>
              <label class="text-sm text-base-content/60">Formula Perhitungan</label>
              <p class="font-mono">{{ indicator.targetCalculationFormula || '-' }}</p>
            </div>
          </div>

          <div v-if="indicator.formula">
            <label class="text-sm text-base-content/60">Deskripsi Formula</label>
            <p class="whitespace-pre-wrap">{{ indicator.formula }}</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="text-sm text-base-content/60">Target</label>
              <p>{{ formatTarget(indicator) }}</p>
            </div>
            <div>
              <label class="text-sm text-base-content/60">Frekuensi Input</label>
              <p>
                <span :class="['badge badge-sm font-medium px-3', indicator.entryFrequency === 'daily' ? 'badge-info' : 'badge-secondary']">
                  {{ indicator.entryFrequency === 'daily' ? 'Harian' : 'Bulanan' }}
                </span>
              </p>
            </div>
            <div>
              <label class="text-sm text-base-content/60">Status</label>
              <p>
                <span :class="['badge badge-sm font-medium px-3', indicator.isActive ? 'badge-success' : 'badge-error']">
                  {{ indicator.isActive ? 'Aktif' : 'Tidak Aktif' }}
                </span>
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-base-content/60">Target adalah Nol</label>
              <p>{{ indicator.targetIsZero ? 'Ya' : 'Tidak' }}</p>
            </div>
            <div>
              <label class="text-sm text-base-content/60">Dokumen</label>
              <a v-if="indicator.documentFile" :href="indicator.documentFile" target="_blank" class="link link-primary">
                Lihat Dokumen
              </a>
              <p v-else>-</p>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" @click="closeModal" class="btn">Tutup</button>
          <!-- <button v-if="indicator" type="button" @click="handleEdit" class="btn btn-primary">
            <Edit class="w-4 h-4" />
            Edit
          </button> -->
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeModal">tutup</button>
      </form>
    </dialog>
  </Teleport>
</template>
