export default defineNuxtRouteMiddleware(async (to) => {
  const { checkAuthSession } = useUser()

  // Check authentication session using proper SSR-compatible method
  const isAuthenticated = await checkAuthSession()

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
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
