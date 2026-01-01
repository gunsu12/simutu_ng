<script setup lang="ts">
import { User, Save, Camera } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const { user } = useAuth()

const profileForm = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
  phone: '',
  nip: '',
  division: '',
  position: ''
})

const handleSave = () => {
  // Implement save logic
  console.log('Saving profile...', profileForm)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-base-content">Profile</h1>
      <p class="text-base-content/60 mt-1">Kelola informasi profil Anda.</p>
    </div>

    <!-- Profile Card -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body">
        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- Avatar -->
          <div class="flex items-center gap-6">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-24">
                <span class="text-3xl">{{ user?.name?.charAt(0) || 'U' }}</span>
              </div>
            </div>
            <div>
              <button type="button" class="btn btn-sm btn-outline gap-2">
                <Camera class="w-4 h-4" />
                Ganti Foto
              </button>
              <p class="text-xs text-base-content/60 mt-2">JPG, PNG max 2MB</p>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Form Fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Nama Lengkap</span>
              </label>
              <input 
                v-model="profileForm.name"
                type="text" 
                class="input input-bordered" 
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">NIP</span>
              </label>
              <input 
                v-model="profileForm.nip"
                type="text" 
                placeholder="Nomor Induk Pegawai"
                class="input input-bordered" 
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Email</span>
              </label>
              <input 
                v-model="profileForm.email"
                type="email" 
                class="input input-bordered" 
                disabled
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">Email tidak dapat diubah</span>
              </label>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">No. Telepon</span>
              </label>
              <input 
                v-model="profileForm.phone"
                type="tel" 
                placeholder="08xxxxxxxxxx"
                class="input input-bordered" 
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Divisi</span>
              </label>
              <input 
                v-model="profileForm.division"
                type="text" 
                placeholder="Nama Divisi"
                class="input input-bordered" 
                disabled
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Jabatan</span>
              </label>
              <input 
                v-model="profileForm.position"
                type="text" 
                placeholder="Jabatan"
                class="input input-bordered" 
                disabled
              />
            </div>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary gap-2">
              <Save class="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
