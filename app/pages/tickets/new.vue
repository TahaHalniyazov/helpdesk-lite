<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const title = ref('')
const description = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function createTicket() {
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/tickets', { method: 'POST', body: { title: title.value, description: description.value } })
    const id = res?.ticket?.id || res?.id
    await navigateTo(`/tickets/${id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card">
    <h1>New Ticket</h1>
    <div v-if="error" class="err">{{ error }}</div>

    <div class="lbl">Title</div>
    <input v-model="title" class="inp" />

    <div class="lbl">Description</div>
    <textarea v-model="description" class="inp area"></textarea>

    <button class="btn btnGreen" :disabled="loading" @click="createTicket()">
      {{ loading ? '...' : 'Create' }}
    </button>
  </div>
</template>

<style scoped>
.card {
  max-width: 720px;
  margin: 0 auto;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
}
h1 { margin: 0 0 14px; font-size: 20px; }
.lbl { margin: 12px 0 6px; font-size: 12px; color: rgba(231,234,240,.7); }
.inp {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.2);
  color: #fff;
  outline: none;
}
.area { min-height: 140px; resize: vertical; }
.btn {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:#fff; cursor:pointer;
}
.btnGreen { border-color: rgba(0,220,130,.35); background: rgba(0,220,130,.14); }
.err {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,90,90,.3);
  background: rgba(255,90,90,.08);
}
</style>
