<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type UserMini = { id: string; email: string; name: string; role: 'ADMIN' | 'AGENT' | 'USER' }
type Ticket = {
  id: string
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  tags: string[]
  createdBy: UserMini
  assignedTo: UserMini | null
  createdAt: string
  updatedAt: string
}
type Comment = { id: string; body: string; createdAt: string; author: UserMini }
type Audit = { id: string; action: string; createdAt: string; actor: UserMini | null; metaJson?: string | null }

const { user } = useAuth()
const route = useRoute()
const id = computed(() => String(route.params.id))

const ticket = ref<Ticket | null>(null)
const comments = ref<Comment[]>([])
const audits = ref<Audit[]>([])
const error = ref<string | null>(null)
const saving = ref(false)

const agents = ref<UserMini[]>([])
const form = reactive({
  title: '',
  description: '',
  status: 'OPEN' as Ticket['status'],
  priority: 'LOW' as Ticket['priority'],
  assignedToId: '' as string,
  tagsText: '',
})

const commentText = ref('')
const tab = ref<'comments' | 'audit'>('comments')

async function loadAll() {
  error.value = null
  try {
    const t: any = await $fetch(`/api/tickets/${id.value}`)
    ticket.value = t?.ticket || t
    if (!ticket.value) throw new Error('Not found')

    form.title = ticket.value.title
    form.description = ticket.value.description
    form.status = ticket.value.status
    form.priority = ticket.value.priority
    form.assignedToId = ticket.value.assignedTo?.id || ''
    form.tagsText = (ticket.value.tags || []).join(', ')

    const c: any = await $fetch(`/api/tickets/${id.value}/comments`)
    comments.value = c?.items || c || []

    const a: any = await $fetch(`/api/tickets/${id.value}/audit`)
    audits.value = a?.items || a || []

    if (user.value?.role === 'ADMIN') {
      const res: any = await $fetch('/api/admin/users', { query: { role: 'AGENT' } })
      agents.value = res.items || []
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed'
  }
}

function parseTags(v: string) {
  return Array.from(
    new Set(
      v.split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    )
  ).slice(0, 10)
}

async function saveTicket() {
  if (!ticket.value) return
  saving.value = true
  try {
    const body: any = {}

    if (user.value?.role === 'USER') {
      body.title = form.title
      body.description = form.description
    } else if (user.value?.role === 'AGENT') {
      body.status = form.status
    } else if (user.value?.role === 'ADMIN') {
      body.title = form.title
      body.description = form.description
      body.status = form.status
      body.priority = form.priority
      body.assignedToId = form.assignedToId || null
      body.tags = parseTags(form.tagsText)
    }

    await $fetch(`/api/tickets/${id.value}`, { method: 'PATCH', body })
    await loadAll()
  } finally {
    saving.value = false
  }
}

async function addComment() {
  const text = commentText.value.trim()
  if (!text) return
  saving.value = true
  try {
    await $fetch(`/api/tickets/${id.value}/comments`, { method: 'POST', body: { body: text } })
    commentText.value = ''
    await loadAll()
  } finally {
    saving.value = false
  }
}

onMounted(loadAll)
</script>

<template>
  <div v-if="error" class="err">{{ error }}</div>
  <div v-else-if="!ticket" class="muted">Loading…</div>

  <div v-else class="grid">
    <section class="card">
      <div class="topRow">
        <h1 class="h">{{ ticket.title }}</h1>
        <button class="btn btnGreen" :disabled="saving" @click="saveTicket()">
          {{ saving ? '...' : 'Save' }}
        </button>
      </div>

      <div class="meta">
        <span class="pill">{{ ticket.status }}</span>
        <span class="pill pill2">{{ ticket.priority }}</span>
        <span class="small">Created by: {{ ticket.createdBy.email }}</span>
        <span class="small" v-if="ticket.assignedTo">Assigned: {{ ticket.assignedTo.email }}</span>
        <span class="small" v-else>Unassigned</span>
      </div>

      <div class="split">
        <div>
          <div class="lbl">Title</div>
          <input v-model="form.title" class="inp" :disabled="user?.role === 'AGENT'" />
        </div>
        <div v-if="user?.role !== 'USER'">
          <div class="lbl">Status</div>
          <select v-model="form.status" class="inp">
            <option>OPEN</option>
            <option>IN_PROGRESS</option>
            <option>RESOLVED</option>
            <option>CLOSED</option>
          </select>
        </div>
      </div>

      <div v-if="user?.role === 'ADMIN'" class="split">
        <div>
          <div class="lbl">Priority</div>
          <select v-model="form.priority" class="inp">
            <option>LOW</option>
            <option>MEDIUM</option>
            <option>HIGH</option>
            <option>URGENT</option>
          </select>
        </div>
        <div>
          <div class="lbl">Assign to</div>
          <select v-model="form.assignedToId" class="inp">
            <option value="">(none)</option>
            <option v-for="a in agents" :key="a.id" :value="a.id">
              {{ a.email }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <div class="lbl">Description</div>
        <textarea v-model="form.description" class="inp area" :disabled="user?.role === 'AGENT'"></textarea>
      </div>

      <div v-if="user?.role === 'ADMIN'">
        <div class="lbl">Tags (comma separated)</div>
        <input v-model="form.tagsText" class="inp" />
      </div>
    </section>

    <section class="card">
      <div class="tabs">
        <button class="tab" :class="{ on: tab==='comments' }" @click="tab='comments'">Comments</button>
        <button class="tab" :class="{ on: tab==='audit' }" @click="tab='audit'">Audit</button>
      </div>

      <div v-if="tab==='comments'">
        <div class="add">
          <input v-model="commentText" class="inp" placeholder="Write a comment..." />
          <button class="btn" :disabled="saving" @click="addComment()">Send</button>
        </div>

        <div class="list">
          <div v-for="c in comments" :key="c.id" class="item">
            <div class="itemTop">
              <div class="who">{{ c.author?.email || 'Unknown' }}</div>
              <div class="when">{{ new Date(c.createdAt).toLocaleString() }}</div>
            </div>
            <div class="body">{{ c.body }}</div>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="list">
          <div v-for="a in audits" :key="a.id" class="item">
            <div class="itemTop">
              <div class="who">{{ a.action }}</div>
              <div class="when">{{ new Date(a.createdAt).toLocaleString() }}</div>
            </div>
            <div class="small2">actor: {{ a.actor?.email || 'system' }}</div>
            <pre v-if="a.metaJson" class="pre">{{ a.metaJson }}</pre>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.grid { display:grid; grid-template-columns: 1.25fr .75fr; gap: 14px; align-items:start; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
.card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
}
.topRow { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.h { margin: 0; font-size: 20px; }
.meta { margin-top: 8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.pill { font-size: 12px; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); }
.pill2 { border-color: rgba(0,220,130,.25); }
.small { font-size: 12px; color: rgba(231,234,240,.7); }
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
.area { min-height: 120px; resize: vertical; }
.split { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 980px) { .split { grid-template-columns: 1fr; } }
.btn {
  padding: 10px 12px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:#fff; cursor:pointer;
}
.btnGreen { border-color: rgba(0,220,130,.35); background: rgba(0,220,130,.14); }
.btn:disabled { opacity:.6; cursor:default; }
.tabs { display:flex; gap:8px; margin-bottom: 12px; }
.tab {
  padding: 8px 10px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(231,234,240,.8);
  cursor:pointer;
}
.tab.on { background: rgba(0,220,130,.12); border-color: rgba(0,220,130,.25); color:#fff; }
.add { display:flex; gap:10px; align-items:center; margin-bottom: 12px; }
.list { display:flex; flex-direction:column; gap:10px; }
.item { padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.12); }
.itemTop { display:flex; justify-content:space-between; gap:10px; }
.who { font-size: 13px; font-weight: 650; }
.when { font-size: 12px; color: rgba(231,234,240,.55); }
.body { margin-top: 6px; white-space: pre-wrap; }
.small2 { margin-top: 6px; font-size: 12px; color: rgba(231,234,240,.65); }
.pre {
  margin-top: 8px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0,0,0,.22);
  border: 1px solid rgba(255,255,255,.08);
  overflow: auto;
  font-size: 12px;
}
.muted { color: rgba(231,234,240,.65); }
.err {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,90,90,.3);
  background: rgba(255,90,90,.08);
}
</style>
