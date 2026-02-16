<script setup lang="ts">
const { user, logout } = useAuth()
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">
        <NuxtLink to="/tickets" class="logo">Helpdesk Lite</NuxtLink>
      </div>

      <nav v-if="user" class="nav">
        <NuxtLink to="/tickets" class="link">Tickets</NuxtLink>
        <NuxtLink v-if="user.role === 'ADMIN'" to="/admin/users" class="link">Admin</NuxtLink>
      </nav>

      <div class="right">
        <div v-if="user" class="me">
          <div class="email">{{ user.email }}</div>
          <div class="role">{{ user.role }}</div>
        </div>
        <button v-if="user" class="btn" @click="logout()">Logout</button>
        <NuxtLink v-else to="/login" class="btn btnGhost">Login</NuxtLink>
      </div>
    </header>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app { min-height: 100vh; background: #0b1220; color: #e7eaf0; }
.top {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(11,18,32,.85);
  backdrop-filter: blur(10px);
}
.logo { color: #e7eaf0; text-decoration: none; font-weight: 700; letter-spacing: .2px; }
.nav { display: flex; gap: 12px; }
.link { color: rgba(231,234,240,.8); text-decoration: none; padding: 8px 10px; border-radius: 10px; }
.link:hover { background: rgba(255,255,255,.06); color: #fff; }
.right { display: flex; align-items: center; gap: 12px; }
.me { display: grid; line-height: 1.1; }
.email { font-size: 13px; color: rgba(231,234,240,.9); }
.role { font-size: 11px; color: rgba(231,234,240,.6); }
.btn {
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: #fff;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
}
.btn:hover { background: rgba(255,255,255,.1); }
.btnGhost { display: inline-flex; align-items: center; text-decoration: none; }
.main { max-width: 1100px; margin: 0 auto; padding: 22px 16px; }
</style>
