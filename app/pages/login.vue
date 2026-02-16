<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { user, login } = useAuth()
const email = ref('admin@local.test')
const password = ref('admin12345')
const loading = ref(false)
const error = ref<string | null>(null)

watchEffect(async () => {
  if (user.value) await navigateTo('/tickets')
})

async function submit() {
  loading.value = true
  error.value = null
  try {
    await login(email.value, password.value)
    await navigateTo('/tickets')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card">
    <h1>Login</h1>

    <div v-if="error" class="err">{{ error }}</div>

    <label class="lbl">Email</label>
    <input v-model="email" class="inp" autocomplete="username" />

    <label class="lbl">Password</label>
    <input v-model="password" class="inp" type="password" autocomplete="current-password" />

    <button class="btn" :disabled="loading" @click="submit()">
      {{ loading ? '...' : 'Sign in' }}
    </button>
  </div>
</template>

<style scoped>
.card {
  max-width: 420px;
  margin: 40px auto 0;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
}
h1 { margin: 0 0 14px; font-size: 20px; }
.lbl { display: block; margin: 12px 0 6px; font-size: 12px; color: rgba(231,234,240,.7); }
.inp {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.2);
  color: #fff;
  outline: none;
}
.inp:focus { border-color: rgba(0,220,130,.6); }
.btn {
  width: 100%;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0,220,130,.35);
  background: rgba(0,220,130,.14);
  color: #fff;
  cursor: pointer;
}
.btn:disabled { opacity: .6; cursor: default; }
.err {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,90,90,.3);
  background: rgba(255,90,90,.08);
  color: rgba(255,220,220,.95);
  font-size: 13px;
}
</style>
