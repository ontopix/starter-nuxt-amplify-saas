export default defineNuxtRouteMiddleware(async (to) => {
  const { checkAuthSession } = useUser()

  // Check authentication session using proper SSR-compatible method
  const isAuthenticated = await checkAuthSession()

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    // Check if there's a redirect query parameter
    const redirect = to.query.redirect as string
    const redirectTo = redirect && redirect !== '/auth/login' && redirect !== '/auth/signup' 
      ? redirect 
      : '/'

    return navigateTo(redirectTo, { replace: true })
  }
})