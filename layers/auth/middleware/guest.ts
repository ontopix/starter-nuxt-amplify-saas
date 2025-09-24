export default defineNuxtRouteMiddleware(async (to) => {
  const { fetchUser, isAuthenticated } = process.server ? useUserServer() : useUser()

  // Get the current event from Nuxt context for server-side execution
  const event = process.server ? useRequestEvent() : undefined

  // Check authentication session using proper SSR-compatible method
  await fetchUser(event)

  // If authenticated, redirect to dashboard
  if (isAuthenticated.value) {
    // Check if there's a redirect query parameter
    const redirect = to.query.redirect as string
    const redirectTo = redirect && redirect !== '/auth/login' && redirect !== '/auth/signup'
      ? redirect
      : '/'

    return navigateTo(redirectTo, { replace: true })
  }
})
