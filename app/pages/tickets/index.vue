<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type TicketItem = {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  createdBy?: { email: string; name: string }
  assignedTo?: { email: string; name: string } | null
  tags?: string[]
}

const q = ref('')
const loading = ref(false)
const items = ref<TicketItem[]>([])
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/tickets', { query: q.value ? { q: q.value } : undefined })
    items.value = res?.items || res || []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load tickets'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="head">
    <h1>Tickets</h1>
    <div class="tools">
      <input v-model="q" class="inp" placeholder="Search..." @keydown.enter="load()" />
      <button class="btn" @click="load()">Refresh</button>
      <NuxtLink to="/tickets/new" class="btn btnGreen">New</NuxtLink>
    </div>
  </div>

  <div v-if="error" class="err">{{ error }}</div>
  <div v-else-if="loading" class="muted">Loading…</div>

  <div v-else class="list">
    <NuxtLink v-for="t in items" :key="t.id" :to="`/tickets/${t.id}`" class="row">
      <div class="left">
        <div class="title">{{ t.title }}</div>
        <div class="meta">
          <span class="pill">{{ t.status }}</span>
          <span class="pill pill2">{{ t.priority }}</span>
          <span v-if="t.tags?.length" class="tags">{{ t.tags.join(', ') }}</span>
        </div>
      </div>

      <div class="right">
        <div class="small" v-if="t.assignedTo">Assigned: {{ t.assignedTo.email }}</div>
        <div class="small" v-else>Unassigned</div>
      </div>
    </NuxtLink>
  </div>
</template>

<style scoped>
.head { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom: 14px; }
h1 { margin: 0; font-size: 22px; }
.tools { display:flex; gap:10px; align-items:center; }
.inp {
  width: 260px; max-width: 55vw;
  padding: 10px 12px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.2); color:#fff; outline:none;
}
.btn {
  padding: 10px 12px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:#fff; cursor:pointer; text-decoration:none; display:inline-flex;
}
.btnGreen { border-color: rgba(0,220,130,.35); background: rgba(0,220,130,.14); }
.list { display:flex; flex-direction:column; gap:10px; }
.row {
  display:flex; justify-content:space-between; gap:14px;
  padding: 14px; border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  text-decoration:none; color:inherit;
}
.row:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.14); }
.title { font-weight: 650; }
.meta { margin-top: 6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.pill {
  font-size: 12px; padding: 4px 8px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(231,234,240,.85);
}
.pill2 { border-color: rgba(0,220,130,.25); }
.tags { font-size: 12px; color: rgba(231,234,240,.6); }
.small { font-size: 12px; color: rgba(231,234,240,.7); }
.muted { color: rgba(231,234,240,.65); }
.err {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,90,90,.3);
  background: rgba(255,90,90,.08);
}
</style>
