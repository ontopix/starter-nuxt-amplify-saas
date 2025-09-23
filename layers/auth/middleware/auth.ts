export default defineNuxtRouteMiddleware(async (to) => {
  // Use appropriate composable based on context
  const { fetchUser, isAuthenticated } = process.server ? useUserServer() : useUser()

  // Get the current event from Nuxt context for server-side execution
  const event = process.server ? useRequestEvent() : undefined

  // Check authentication session using proper SSR-compatible method
  await fetchUser(event)

  // If not authenticated, redirect to login page
  if (!isAuthenticated.value) {
    // Only add redirect parameter if not going to root page
    const redirectQuery = to.fullPath !== '/' ? { redirect: to.fullPath } : {}

    return navigateTo({
      path: '/auth/login',
      query: redirectQuery
    }, {
      replace: true
    })
  }
})
