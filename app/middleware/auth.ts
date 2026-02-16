export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { user, fetchMe, ready } = useAuth()
  if (!ready.value) await fetchMe()

  if (!user.value) return navigateTo('/login')
})
