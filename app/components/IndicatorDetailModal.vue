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
  // Kamus / Profile fields
  dasarPemikiran?: string | null
  jenisIndikator?: string | null
  satuanPengukuran?: string | null
  kriteriaInklusi?: string | null
  kriteriaEksklusi?: string | null
  metodePengumpulanData?: string | null
  sumberData?: string | null
  instrumenPengambilanData?: string | null
  besarSampel?: string | null
  caraPengambilanSampel?: string | null
  periodePengumpulanData?: string | null
  penyajianData?: string | null
  periodeAnalisisDanPelaporanData?: string | null
  penanggungJawab?: string | null
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
      <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <div v-else-if="indicator" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-base-200 p-4 rounded-xl">
            <div>
              <label class="text-xs text-base-content/50 uppercase tracking-wider">Kode</label>
              <p class="font-mono font-bold text-lg">{{ indicator.code }}</p>
            </div>
            <div>
              <label class="text-xs text-base-content/50 uppercase tracking-wider">Kategori</label>
              <p class="font-semibold text-lg text-primary">{{ indicator.categoryName }}</p>
            </div>
            <div>
              <label class="text-xs text-base-content/50 uppercase tracking-wider">Frekuensi Input</label>
              <p>
                <span :class="['badge badge-md font-medium px-3 mt-1', indicator.entryFrequency === 'daily' ? 'badge-info' : 'badge-secondary']">
                  {{ indicator.entryFrequency === 'daily' ? 'Harian' : 'Bulanan' }}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label class="text-sm font-semibold text-base-content/75">Judul Indikator</label>
            <p class="font-medium text-base-content text-base mt-0.5">{{ indicator.judul }}</p>
          </div>

          <!-- Kamus/Profile Fields (Kamus Indikator Mutu) -->
          <div class="border border-base-300 rounded-xl overflow-hidden">
            <div class="bg-base-200/50 px-4 py-2 border-b border-base-300 font-semibold text-sm">
              Profil / Kamus Indikator Lengkap
            </div>
            <div class="divide-y divide-base-200">
              <div v-if="indicator.dasarPemikiran" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Dasar Pemikiran</div>
                <div class="md:col-span-3 text-sm whitespace-pre-wrap">{{ indicator.dasarPemikiran }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Dimensi Mutu</div>
                <div class="md:col-span-3 text-sm">{{ indicator.dimensiMutu || '-' }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Tujuan</div>
                <div class="md:col-span-3 text-sm whitespace-pre-wrap">{{ indicator.tujuan || '-' }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Definisi Operasional</div>
                <div class="md:col-span-3 text-sm whitespace-pre-wrap">{{ indicator.definisiOperasional || '-' }}</div>
              </div>
              <div v-if="indicator.jenisIndikator" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Jenis Indikator</div>
                <div class="md:col-span-3 text-sm">{{ indicator.jenisIndikator }}</div>
              </div>
              <div v-if="indicator.satuanPengukuran" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Satuan Pengukuran</div>
                <div class="md:col-span-3 text-sm">{{ indicator.satuanPengukuran }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Numerator (Pembilang)</div>
                <div class="md:col-span-3 text-sm">{{ indicator.numerator || '-' }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Denominator (Penyebut)</div>
                <div class="md:col-span-3 text-sm">{{ indicator.denominator || '-' }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Formula Perhitungan</div>
                <div class="md:col-span-3 text-sm font-mono">{{ indicator.targetCalculationFormula || '-' }}</div>
              </div>
              <div v-if="indicator.formula" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Deskripsi Formula</div>
                <div class="md:col-span-3 text-sm whitespace-pre-wrap">{{ indicator.formula }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Target Pencapaian</div>
                <div class="md:col-span-3 text-sm font-bold text-success">{{ formatTarget(indicator) }}</div>
              </div>
              <div v-if="indicator.kriteriaInklusi" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Kriteria Inklusi</div>
                <div class="md:col-span-3 text-sm whitespace-pre-wrap">{{ indicator.kriteriaInklusi }}</div>
              </div>
              <div v-if="indicator.kriteriaEksklusi" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Kriteria Eksklusi</div>
                <div class="md:col-span-3 text-sm whitespace-pre-wrap">{{ indicator.kriteriaEksklusi }}</div>
              </div>
              <div v-if="indicator.metodePengumpulanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Metode Pengumpulan Data</div>
                <div class="md:col-span-3 text-sm">{{ indicator.metodePengumpulanData }}</div>
              </div>
              <div v-if="indicator.sumberData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Sumber Data</div>
                <div class="md:col-span-3 text-sm">{{ indicator.sumberData }}</div>
              </div>
              <div v-if="indicator.instrumenPengambilanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Instrumen Pengambilan Data</div>
                <div class="md:col-span-3 text-sm">{{ indicator.instrumenPengambilanData }}</div>
              </div>
              <div v-if="indicator.besarSampel" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Besar Sampel</div>
                <div class="md:col-span-3 text-sm">{{ indicator.besarSampel }}</div>
              </div>
              <div v-if="indicator.caraPengambilanSampel" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Cara Pengambilan Sampel</div>
                <div class="md:col-span-3 text-sm">{{ indicator.caraPengambilanSampel }}</div>
              </div>
              <div v-if="indicator.periodePengumpulanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Periode Pengumpulan Data</div>
                <div class="md:col-span-3 text-sm">{{ indicator.periodePengumpulanData }}</div>
              </div>
              <div v-if="indicator.penyajianData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Penyajian Data</div>
                <div class="md:col-span-3 text-sm">{{ indicator.penyajianData }}</div>
              </div>
              <div v-if="indicator.periodeAnalisisDanPelaporanData" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Periode Analisis & Pelaporan</div>
                <div class="md:col-span-3 text-sm">{{ indicator.periodeAnalisisDanPelaporanData }}</div>
              </div>
              <div v-if="indicator.penanggungJawab" class="grid grid-cols-1 md:grid-cols-4 p-3 gap-1 md:gap-4">
                <div class="font-medium text-sm text-base-content/75">Penanggung Jawab</div>
                <div class="md:col-span-3 text-sm">{{ indicator.penanggungJawab }}</div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-base-content/75">Target adalah Nol</label>
              <p class="text-sm text-base-content/60">{{ indicator.targetIsZero ? 'Ya' : 'Tidak' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-base-content/75">Dokumen Lampiran</label>
              <p class="text-sm">
                <a v-if="indicator.documentFile" :href="indicator.documentFile" target="_blank" class="link link-primary inline-flex items-center gap-1">
                  Lihat Dokumen
                </a>
                <span v-else class="text-base-content/60">-</span>
              </p>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" @click="closeModal" class="btn">Tutup</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeModal">tutup</button>
      </form>
    </dialog>
  </Teleport>
</template>
