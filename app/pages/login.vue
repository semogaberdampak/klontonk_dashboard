<script setup lang="ts">
import { APP_VERSION } from '~/config'

// Halaman login admin platform. Memakai EMAIL + PASSWORD; akunnya harus terdaftar di tabel
// platform_admins (lihat README bagian "Pasang sekali"). Tanpa baris itu, login ditolak.
definePageMeta({ layout: false })
useHead({ title: 'Masuk - Klontonk Dashboard' })

const { login } = useAuth()
const { toast } = useToast()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
const emailInput = ref<HTMLInputElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)

onMounted(() => setTimeout(() => emailInput.value?.focus(), 80))

async function submit(): Promise<void> {
  error.value = null
  if (!email.value.trim() || !password.value) {
    error.value = 'Email dan password wajib diisi.'
    return
  }

  busy.value = true
  try {
    const result = await login(email.value, password.value)
    if (result.success) {
      toast(`Selamat datang, ${result.admin.name}.`, { type: 'success' })
      await navigateTo(DEFAULT_PATH)
    } else {
      error.value = result.error
      password.value = ''
      passwordInput.value?.focus()
    }
  } catch {
    error.value = 'Terjadi kesalahan. Coba lagi.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-head">
        <div class="login-logo">K</div>
        <h1>Klontonk Dashboard</h1>
        <p>Manajemen client, langganan, dan log</p>
      </div>

      <form class="login-form" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="loginEmail">Email admin platform</label>
          <input id="loginEmail" ref="emailInput" v-model="email" type="email" name="email" autocomplete="username" placeholder="nama@contoh.com" required />
        </div>
        <div class="field">
          <label for="loginPassword">Password</label>
          <input id="loginPassword" ref="passwordInput" v-model="password" type="password" name="password" autocomplete="current-password" placeholder="Password" required />
        </div>
        <div v-if="error" class="form-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? 'Memproses...' : 'Masuk' }}</button>
      </form>

      <p class="login-note">v{{ APP_VERSION }} &middot; khusus admin platform (vendor)</p>
    </div>
  </div>
</template>
