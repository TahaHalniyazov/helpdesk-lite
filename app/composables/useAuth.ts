type AuthUser = { id: string; email: string; name: string; role: 'ADMIN' | 'AGENT' | 'USER' }

export function useAuth() {
  const user = useState<AuthUser | null>('auth.user', () => null)
  const ready = useState<boolean>('auth.ready', () => false)

  async function fetchMe() {
    try {
      const res = await $fetch<{ user: AuthUser }>('/api/auth/me')
      user.value = res.user
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function login(email: string, password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await fetchMe()
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    await navigateTo('/login')
  }

  return { user, ready, fetchMe, login, logout }
}
