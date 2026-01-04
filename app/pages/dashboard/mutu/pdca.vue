<script setup lang="ts">
import { Plus, Search, Edit, Trash2, Eye, ClipboardCheck, Calendar, AlertCircle } from 'lucide-vue-next'
import RichTextEditor from '~/components/RichTextEditor.vue'
import { Printer } from 'lucide-vue-next'
import { sanitizeHtml } from '~/utils/sanitize'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Types
interface IndicatorEntryItem {
  id: string
  indicatorEntryId: string
  indicatorId: string
  numeratorValue: number | null
  denominatorValue: number | null
  skor: number | null
  numeratorDenominatorResult: number | null
  isNeedPDCA: boolean
  notes: string | null
  indicator: {
    id: string
    code: string
    judul: string
    target: number | null
    targetUnit: string | null
    targetKeterangan: string | null
  }
  entry: {
    id: string
    entryCode: string
    entryDate: string
    status: string
  }
  unit: {
    id: string
    name: string
    unitCode: string
  } | null
  hasPdca: boolean
}

interface PdcaEntry {
  id: string
  entryItemId: string
  pdcaDate: string
  problemTitle: string
  stepDescription: string | null
  planDescription: string | null
  doDescription: string | null
  checkStudy: string | null
  action: string | null
  createdBy: string
  createdAt: string
  entryItem: {
    id: string
    indicatorEntryId: string
    indicator: {
      code: string
      judul: string
    }
  } | null
  entry: {
    id: string
    entryCode: string
    entryDate: string
  } | null
  unit: {
    name: string
  } | null
  createdByUser: {
    id: string
    name: string
  } | null
}

// Notification state
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const notifications = ref<Notification[]>([])

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) {
  const id = Math.random().toString(36).substr(2, 9)
  notifications.value.push({ id, type, message })
  
  if (duration > 0) {
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, duration)
  }
}

function closeNotification(id: string) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

// State
const searchQuery = ref('')
const activeTab = ref<'list' | 'new'>('list')
const pdcaList = ref<PdcaEntry[]>([])
const needsPdcaList = ref<IndicatorEntryItem[]>([])
const loading = ref(false)
const loadingNeedsPdca = ref(false)

// Modal state
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'view'>('create')
const selectedPdca = ref<PdcaEntry | null>(null)
const selectedEntryItem = ref<IndicatorEntryItem | null>(null)

// Calculated Indicators Modal state
const showCalculatedIndicatorsModal = ref(false)
const selectedEntryForIndicators = ref<any>(null)

// Form state
const formData = ref({
  entryItemId: '',
  pdcaDate: new Date().toISOString().split('T')[0],
  problemTitle: '',
  stepDescription: '',
  planDescription: '',
  doDescription: '',
  checkStudy: '',
  action: '',
})

const submitting = ref(false)

// Computed
const filteredPdcaList = computed(() => {
  if (!searchQuery.value) return pdcaList.value
  const query = searchQuery.value.toLowerCase()
  return pdcaList.value.filter(pdca => 
    pdca.problemTitle.toLowerCase().includes(query) ||
    pdca.entryItem?.indicator?.code?.toLowerCase().includes(query) ||
    pdca.entryItem?.indicator?.judul?.toLowerCase().includes(query) ||
    pdca.unit?.name?.toLowerCase().includes(query)
  )
})

const filteredNeedsPdcaList = computed(() => {
  // Filter out items that already have PDCA
  return needsPdcaList.value.filter(item => !item.hasPdca)
})

// Methods
async function fetchPdcaList() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: PdcaEntry[] }>('/api/indicator-pdcas')
    if (response.success) {
      pdcaList.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch PDCA list:', error)
    showNotification(error.data?.message || 'Failed to fetch PDCA list', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchNeedsPdca() {
  loadingNeedsPdca.value = true
  try {
    const response = await $fetch<{ success: boolean; data: IndicatorEntryItem[] }>('/api/indicator-pdcas/needs-pdca')
    if (response.success) {
      needsPdcaList.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch needs PDCA list:', error)
    showNotification(error.data?.message || 'Failed to fetch indicators needing PDCA', 'error')
  } finally {
    loadingNeedsPdca.value = false
  }
}

function openCreateModal(entryItem: IndicatorEntryItem) {
  selectedEntryItem.value = entryItem
  formData.value = {
    entryItemId: entryItem.id,
    pdcaDate: new Date().toISOString().split('T')[0],
    problemTitle: '',
    stepDescription: '',
    planDescription: '<ul><li><strong>Saya Berencana :</strong><ul><li></li></ul></li><li><strong>Saya Berharap :</strong><ul><li></li></ul></li><li><strong>Tindakan :</strong><ul><li></li></ul></li></ul>',
    doDescription: '<p><strong>Apa yang anda amati ?</strong></p>',
    checkStudy: '<p><strong>Apa yang anda pelajari ? apakah sesuai dengan target capaian ?</strong></p>',
    action: '<p><strong>Apa yang dapat anda simpulkan dari siklus ini ?</strong></p><p>&nbsp;</p><p><strong>Follow-up dan rencana lanjutan</strong></p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>',
  }
  modalMode.value = 'create'
  modalOpen.value = true
}

function openViewModal(pdca: PdcaEntry) {
  selectedPdca.value = pdca
  modalMode.value = 'view'
  modalOpen.value = true
}

function openEditModal(pdca: PdcaEntry) {
  selectedPdca.value = pdca
  formData.value = {
    entryItemId: pdca.entryItemId,
    pdcaDate: new Date(pdca.pdcaDate).toISOString().split('T')[0],
    problemTitle: pdca.problemTitle,
    stepDescription: pdca.stepDescription || '',
    planDescription: pdca.planDescription || '',
    doDescription: pdca.doDescription || '',
    checkStudy: pdca.checkStudy || '',
    action: pdca.action || '',
  }
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  selectedPdca.value = null
  selectedEntryItem.value = null
}

async function submitForm() {
  if (!formData.value.problemTitle.trim()) {
    showNotification('Judul Permasalahan wajib diisi', 'error')
    return
  }

  submitting.value = true
  try {
    if (modalMode.value === 'create') {
      const response = await $fetch<{ success: boolean; message: string }>('/api/indicator-pdcas', {
        method: 'POST',
        body: formData.value,
      })
      
      if (response.success) {
        showNotification('PDCA berhasil ditambahkan', 'success')
        closeModal()
        await fetchPdcaList()
        await fetchNeedsPdca()
        activeTab.value = 'list'
      } else {
        showNotification(response.message || 'Gagal menambahkan PDCA', 'error')
      }
    } else if (modalMode.value === 'edit' && selectedPdca.value) {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/indicator-pdcas/${selectedPdca.value.id}`, {
        method: 'PUT',
        body: formData.value,
      })
      
      if (response.success) {
        showNotification('PDCA berhasil diperbarui', 'success')
        closeModal()
        await fetchPdcaList()
      } else {
        showNotification(response.message || 'Gagal memperbarui PDCA', 'error')
      }
    }
  } catch (error: any) {
    console.error('Submit error:', error)
    showNotification(error.data?.message || 'Terjadi kesalahan', 'error')
  } finally {
    submitting.value = false
  }
}

async function deletePdca(pdca: PdcaEntry) {
  if (!confirm('Apakah Anda yakin ingin menghapus PDCA ini?')) return
  
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/indicator-pdcas/${pdca.id}`, {
      method: 'DELETE',
    })
    
    if (response.success) {
      showNotification('PDCA berhasil dihapus', 'success')
      await fetchPdcaList()
      await fetchNeedsPdca()
    } else {
      showNotification(response.message || 'Gagal menghapus PDCA', 'error')
    }
  } catch (error: any) {
    console.error('Delete error:', error)
    showNotification(error.data?.message || 'Terjadi kesalahan', 'error')
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function openCalculatedIndicatorsModal(pdca: PdcaEntry) {
  try {
    // Fetch the full entry data with all items using the entry ID
    if (!pdca.entry?.id) {
      showNotification('Entry ID not found', 'error')
      return
    }
    
    const response = await $fetch<{ success: boolean; data: any }>(`/api/indicator-entries/${pdca.entry.id}`)
    if (response.success) {
      selectedEntryForIndicators.value = response.data
      showCalculatedIndicatorsModal.value = true
    }
  } catch (error: any) {
    console.error('Failed to fetch entry:', error)
    showNotification(error.data?.message || 'Failed to fetch entry details', 'error')
  }
}

function closeCalculatedIndicatorsModal() {
  showCalculatedIndicatorsModal.value = false
  selectedEntryForIndicators.value = null
}

function printPdca() {
  if (selectedPdca.value) {
    const printWindow = window.open('', '', 'height=800,width=1000')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan PDCA</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .print-page {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .print-header {
              display: flex;
              align-items: flex-start;
              gap: 20px;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #000;
            }
            .print-logo {
              border: 2px solid #000;
              padding: 10px;
              width: 80px;
              height: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              text-align: center;
              font-size: 10px;
              font-weight: bold;
              line-height: 1.2;
            }
            .print-header-title {
              flex: 1;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
            }
            .print-title {
              text-align: center;
              margin-bottom: 15px;
              font-size: 14px;
              font-weight: bold;
            }
            .print-info {
              margin-bottom: 15px;
              font-size: 11px;
            }
            .print-info-row {
              margin-bottom: 3px;
              display: flex;
            }
            .print-info-label {
              min-width: 150px;
              font-weight: bold;
            }
            .print-info-value {
              flex: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border: 1px solid #000;
            }
            td {
              border: 1px solid #000;
              padding: 8px;
              font-size: 10px;
            }
            .header-cell {
              font-weight: bold;
              background-color: #f5f5f5;
              width: 100px;
              vertical-align: top;
            }
            .content-cell {
              vertical-align: top;
            }
            .signature-section {
              margin-top: 30px;
            }
            .signature-table {
              width: 100%;
              border-collapse: collapse;
            }
            .signature-col {
              width: 33.33%;
              text-align: center;
              padding: 20px 10px;
              font-size: 11px;
            }
            .signature-title {
              font-weight: bold;
              margin-bottom: 40px;
            }
            .signature-name {
              font-size: 10px;
              border-top: 1px solid #000;
              padding-top: 5px;
            }
            ul, ol {
              margin: 5px 0 5px 20px;
              font-size: 10px;
            }
            li {
              margin: 2px 0;
            }
            p {
              margin: 3px 0;
              font-size: 10px;
            }
            strong {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <div class="print-header">
              <div class="print-logo">BROS<br/>HOSPITAL</div>
              <div class="print-header-title">Cotak Laporan</div>
            </div>
            
            <div class="print-title">
              <h2>Laporan Kegiatan PDCA / PDSA</h2>
            </div>
            
            <div class="print-info">
              <div class="print-info-row">
                <span class="print-info-label">Judul Indikator :</span>
                <span class="print-info-value"><strong>${selectedPdca.value.entryItem?.indicator?.judul || '-'}</strong></span>
              </div>
              <div class="print-info-row">
                <span class="print-info-label">Unit :</span>
                <span class="print-info-value"><strong>${selectedPdca.value.unit?.name || '-'}</strong></span>
              </div>
              <div class="print-info-row">
                <span class="print-info-label">Bulan / Tahun :</span>
                <span class="print-info-value">${new Date(selectedPdca.value.pdcaDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            
            <table>
              <tr>
                <td class="header-cell">PROBLEM</td>
                <td class="content-cell">${selectedPdca.value.problemTitle || '-'}</td>
              </tr>
              <tr>
                <td class="header-cell">STEP</td>
                <td class="content-cell">${selectedPdca.value.stepDescription || '-'}</td>
              </tr>
              <tr>
                <td class="header-cell">PLAN</td>
                <td class="content-cell">${selectedPdca.value.planDescription || '-'}</td>
              </tr>
              <tr>
                <td class="header-cell">DO</td>
                <td class="content-cell">${selectedPdca.value.doDescription || '-'}</td>
              </tr>
              <tr>
                <td class="header-cell">CHECK / STUDY</td>
                <td class="content-cell">${selectedPdca.value.checkStudy || '-'}</td>
              </tr>
              <tr>
                <td class="header-cell">ACTION</td>
                <td class="content-cell">${selectedPdca.value.action || '-'}</td>
              </tr>
            </table>
            
            <div class="signature-section">
              <table class="signature-table">
                <tr>
                  <td class="signature-col">
                    <div class="signature-title">Mengetahui</div>
                  </td>
                  <td class="signature-col">
                    <div class="signature-title">Manajer</div>
                  </td>
                  <td class="signature-col">
                    <div class="signature-title">Yang membuat,</div>
                  </td>
                </tr>
                <tr>
                  <td class="signature-col">
                    <div class="signature-name">Nama / NIP</div>
                  </td>
                  <td class="signature-col">
                    <div class="signature-name">Nama / NIP</div>
                  </td>
                  <td class="signature-col">
                    <div class="signature-name">${selectedPdca.value.createdByUser?.name || 'Nama / NIP'}</div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }
}

// Initial load
onMounted(() => {
  fetchPdcaList()
  fetchNeedsPdca()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="alert shadow-lg max-w-sm"
          :class="{
            'alert-success': notification.type === 'success',
            'alert-error': notification.type === 'error',
            'alert-warning': notification.type === 'warning',
            'alert-info': notification.type === 'info'
          }"
        >
          <span>{{ notification.message }}</span>
          <button class="btn btn-ghost btn-xs" @click="closeNotification(notification.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">Laporan Kegiatan PDCA</h1>
        <p class="text-base-content/60 mt-1">Kelola laporan kegiatan Plan-Do-Check-Act untuk indikator yang tidak tercapai.</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-base-200 p-1 w-fit">
      <button 
        class="tab"
        :class="{ 'tab-active': activeTab === 'list' }"
        @click="activeTab = 'list'"
      >
        <ClipboardCheck class="w-4 h-4 mr-2" />
        Daftar PDCA
      </button>
      <button 
        class="tab"
        :class="{ 'tab-active': activeTab === 'new' }"
        @click="activeTab = 'new'"
      >
        <Plus class="w-4 h-4 mr-2" />
        Buat PDCA Baru
      </button>
    </div>

    <!-- PDCA List Tab -->
    <div v-if="activeTab === 'list'" class="space-y-4">
      <!-- Search -->
      <div class="flex gap-4">
        <div class="form-control flex-1 max-w-md">
          <div class="input-group">
            <span class="bg-base-200">
              <Search class="w-4 h-4" />
            </span>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Cari PDCA..." 
              class="input input-bordered w-full"
            />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPdcaList.length === 0" class="card bg-base-100 border border-base-300">
        <div class="card-body items-center text-center py-12">
          <ClipboardCheck class="w-16 h-16 text-base-content/30 mb-4" />
          <h3 class="text-lg font-semibold">Belum ada data PDCA</h3>
          <p class="text-base-content/60">Klik tab "Buat PDCA Baru" untuk menambahkan laporan PDCA.</p>
        </div>
      </div>

      <!-- PDCA Table -->
      <div v-else class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table">
            <thead class="bg-base-200/50">
              <tr>
                <th>Tanggal</th>
                <th>Indikator</th>
                <th>Unit</th>
                <th>Judul Permasalahan</th>
                <th>Dibuat Oleh</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pdca in filteredPdcaList" :key="pdca.id">
                <td>{{ formatDate(pdca.pdcaDate) }}</td>
                <td>
                  <div class="font-medium">{{ pdca.entryItem?.indicator?.code }}</div>
                  <div class="text-sm text-base-content/60 truncate max-w-xs">{{ pdca.entryItem?.indicator?.judul }}</div>
                </td>
                <td>{{ pdca.unit?.name || '-' }}</td>
                <td class="max-w-xs truncate">{{ pdca.problemTitle }}</td>
                <td>{{ pdca.createdByUser?.name || '-' }}</td>
                <td>
                  <div class="flex items-center justify-center gap-1">
                    <button 
                      class="btn btn-ghost btn-xs" 
                      title="Lihat"
                      @click="openViewModal(pdca)"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button 
                      class="btn btn-ghost btn-xs" 
                      title="Edit"
                      @click="openEditModal(pdca)"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button 
                      class="btn btn-ghost btn-xs text-error" 
                      title="Hapus"
                      @click="deletePdca(pdca)"
                    >
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

    <!-- New PDCA Tab -->
    <div v-if="activeTab === 'new'" class="space-y-4">
      <div class="alert alert-info">
        <AlertCircle class="w-5 h-5" />
        <span>Pilih indikator yang tidak tercapai target untuk membuat laporan PDCA.</span>
      </div>

      <!-- Loading -->
      <div v-if="loadingNeedsPdca" class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredNeedsPdcaList.length === 0" class="card bg-base-100 border border-base-300">
        <div class="card-body items-center text-center py-12">
          <ClipboardCheck class="w-16 h-16 text-success mb-4" />
          <h3 class="text-lg font-semibold">Semua indikator tercapai!</h3>
          <p class="text-base-content/60">Tidak ada indikator yang memerlukan PDCA saat ini.</p>
        </div>
      </div>

      <!-- Needs PDCA Table -->
      <div v-else class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        <div class="card-body p-4 border-b border-base-300">
          <h3 class="font-semibold">Indikator Tidak Tercapai</h3>
          <p class="text-sm text-base-content/60">Klik tombol "Buat PDCA" untuk membuat laporan PDCA.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="table">
            <thead class="bg-base-200/50">
              <tr>
                <th>Tanggal Entry</th>
                <th>Kode</th>
                <th>Indikator</th>
                <th>Unit</th>
                <th class="text-center">Hasil</th>
                <th class="text-center">Target</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredNeedsPdcaList" :key="item.id">
                <td>{{ formatDate(item.entry.entryDate) }}</td>
                <td class="font-medium">{{ item.indicator.code }}</td>
                <td class="max-w-xs truncate">{{ item.indicator.judul }}</td>
                <td>{{ item.unit?.name || '-' }}</td>
                <td class="text-center">
                  <span class="text-error font-medium">
                    {{ item.numeratorDenominatorResult !== null ? Number(item.numeratorDenominatorResult).toFixed(2) : '-' }}
                    {{ item.indicator.targetUnit === 'percentage' ? '%' : '' }}
                  </span>
                </td>
                <td class="text-center">
                  {{ item.indicator.targetKeterangan || '>=' }} 
                  {{ item.indicator.target }}
                  {{ item.indicator.targetUnit === 'percentage' ? '%' : '' }}
                </td>
                <td class="text-center">
                  <button 
                    class="btn btn-primary btn-sm gap-1"
                    @click="openCreateModal(item)"
                  >
                    <Plus class="w-4 h-4" />
                    Buat PDCA
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Teleport to="body">
        <!-- PDCA Modal -->
        <dialog :class="{ 'modal modal-open': modalOpen, 'modal': !modalOpen }">
        <div class="modal-box max-w-6xl h-screen max-h-[95vh]">
            <h3 class="font-bold text-lg mb-4">
            {{ modalMode === 'create' ? 'Buat PDCA Baru' : modalMode === 'edit' ? 'Edit PDCA' : 'Detail PDCA' }}
            </h3>
            
            <!-- View Mode -->
            <div v-if="modalMode === 'view' && selectedPdca" class="space-y-4 overflow-y-auto max-h-[calc(95vh-8rem)] pdca-view">
            <div class="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                <label class="label"><span class="label-text font-medium text-xs uppercase">Indikator</span></label>
                <p class="font-semibold">{{ selectedPdca.entryItem?.indicator?.code }}</p>
                <p class="text-sm text-base-content/70">{{ selectedPdca.entryItem?.indicator?.judul }}</p>
                </div>
                <div>
                <label class="label"><span class="label-text font-medium text-xs uppercase">Tanggal PDCA</span></label>
                <p class="font-semibold">{{ formatDate(selectedPdca.pdcaDate) }}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                <label class="label"><span class="label-text font-medium text-xs uppercase">Entry Code</span></label>
                <p class="font-semibold">{{ selectedPdca.entry?.entryCode || '-' }}</p>
                </div>
                <div>
                <label class="label"><span class="label-text font-medium text-xs uppercase">Tanggal Entry</span></label>
                <p class="font-semibold">{{ selectedPdca.entry?.entryDate ? formatDate(selectedPdca.entry.entryDate) : '-' }}</p>
                </div>
            </div>

            <div class="border-b pb-4 flex items-center justify-between">
                <div class="flex-1">
                  <label class="label"><span class="label-text font-medium text-xs uppercase">Unit</span></label>
                  <p class="font-semibold">{{ selectedPdca.unit?.name || '-' }}</p>
                </div>
                <button 
                  type="button"
                  class="btn btn-outline btn-sm gap-2"
                  @click="openCalculatedIndicatorsModal(selectedPdca)"
                  title="View all indicators for this entry"
                >
                  <Eye class="w-4 h-4" />
                  Lihat Entry Indikator Terkait
                </button>
            </div>

            <div class="border-b pb-4">
                <label class="label"><span class="label-text font-medium text-xs uppercase">Dibuat Oleh</span></label>
                <p class="font-semibold">{{ selectedPdca.createdByUser?.name || '-' }} ({{ formatDate(selectedPdca.createdAt) }})</p>
            </div>
            
            <div>
                <label class="label"><span class="label-text font-medium">Judul Permasalahan</span></label>
                <p class="p-3 bg-base-200 rounded-lg">{{ selectedPdca.problemTitle }}</p>
            </div>
            
            <div class="grid grid-cols-1 gap-4">
                <div>
                <label class="label"><span class="label-text font-medium">Langkah Perbaikan (Step)</span></label>
                <p class="p-3 bg-base-200 rounded-lg min-h-20">{{ selectedPdca.stepDescription || '-' }}</p>
                </div>
            <div>
                <label class="label"><span class="label-text font-medium">Plan</span></label>
                <div class="p-3 bg-base-200 rounded-lg min-h-20 prose prose-sm max-w-none" v-html="sanitizeHtml(selectedPdca.planDescription)"></div>
            </div>
            <div>
                <label class="label"><span class="label-text font-medium">Do</span></label>
                <div class="p-3 bg-base-200 rounded-lg min-h-20 prose prose-sm max-w-none" v-html="sanitizeHtml(selectedPdca.doDescription)"></div>
                </div>
                <div>
                <label class="label"><span class="label-text font-medium">Check/Study</span></label>
                <div class="p-3 bg-base-200 rounded-lg min-h-20 prose prose-sm max-w-none" v-html="sanitizeHtml(selectedPdca.checkStudy)"></div>
                </div>
            </div>
            
            <div>
                <label class="label"><span class="label-text font-medium">Action</span></label>
                <div class="p-3 bg-base-200 rounded-lg prose prose-sm max-w-none" v-html="sanitizeHtml(selectedPdca.action)"></div>
            </div>
            
            <div class="modal-action">
                <button class="btn" @click="closeModal">Tutup</button>
                <button class="btn btn-outline gap-2" @click="printPdca">
                  <Printer class="w-4 h-4" />
                  Print
                </button>
                <button class="btn btn-primary" @click="openEditModal(selectedPdca)">Edit</button>
            </div>
            
            </div>
            
            <!-- Create/Edit Form -->
            <form v-else @submit.prevent="submitForm" class="space-y-4 overflow-y-auto max-h-[calc(95vh-8rem)]">
            <!-- Selected Indicator Info (for create mode) -->
            <div v-if="modalMode === 'create' && selectedEntryItem" class="alert alert-info">
                <div>
                <div class="font-medium">{{ selectedEntryItem.indicator.code }}</div>
                <div class="text-sm">{{ selectedEntryItem.indicator.judul }}</div>
                <div class="text-sm">Unit: {{ selectedEntryItem.unit?.name || '-' }}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                <label class="label"><span class="label-text">Tanggal PDCA <span class="text-error">*</span></span></label>
                <input 
                    v-model="formData.pdcaDate"
                    type="date" 
                    class="input input-bordered"
                    required
                />
                </div>
            </div>
            
            <div class="form-control">
                <label class="label"><span class="label-text">Judul Permasalahan <span class="text-error">*</span></span></label>
                <input 
                v-model="formData.problemTitle"
                type="text" 
                class="input input-bordered"
                placeholder="Masukkan judul permasalahan"
                required
                />
            </div>
            
            <div class="form-control">
                <label class="label"><span class="label-text">Langkah Perbaikan (Step)</span></label>
                <textarea 
                v-model="formData.stepDescription"
                class="textarea textarea-bordered h-24"
                placeholder="Jelaskan langkah-langkah perbaikan yang akan dilakukan"
                ></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                <label class="label"><span class="label-text">Plan</span></label>
                <RichTextEditor 
                    v-model="formData.planDescription"
                    placeholder="Rencana tindakan"
                />
                </div>
                <div class="form-control">
                <label class="label"><span class="label-text">Do</span></label>
                <RichTextEditor 
                    v-model="formData.doDescription"
                    placeholder="Pelaksanaan tindakan"
                />
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                <label class="label"><span class="label-text">Check/Study</span></label>
                <RichTextEditor 
                    v-model="formData.checkStudy"
                    placeholder="Evaluasi hasil tindakan"
                />
                </div>
                
                <div class="form-control">
                <label class="label"><span class="label-text">Action</span></label>
                <RichTextEditor 
                    v-model="formData.action"
                    placeholder="Tindakan yang diambil"
                />
                </div>
            </div>
            
            <div class="modal-action">
                <button type="button" class="btn" @click="closeModal" :disabled="submitting">Batal</button>
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                {{ modalMode === 'create' ? 'Simpan' : 'Update' }}
                </button>
            </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop" @click="closeModal">
            <button>close</button>
        </form>
        </dialog>
    </Teleport>

    <!-- Calculated Indicators Modal -->
    <CalculatedIndicatorsModal
      :is-open="showCalculatedIndicatorsModal"
      :selected-entry="selectedEntryForIndicators"
      @close="closeCalculatedIndicatorsModal"
      @viewDetail="() => {}"
    />
  </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>

