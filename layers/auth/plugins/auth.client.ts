/**
 * Initialize user authentication state on app startup
 * This plugin automatically checks if there's an existing session
 * and loads the user data if authenticated
 */
export default defineNuxtPlugin(async () => {
  const { getCurrentUser, isAuthenticated } = useUser()
  
  // Initialize user session on app start
  // This will check for existing auth tokens and load user data
  await getCurrentUser()
  
  // Set up periodic session refresh for authenticated users
  if (isAuthenticated.value) {
    // Refresh session every 30 minutes to keep tokens valid
    setInterval(async () => {
      await getCurrentUser()
    }, 30 * 60 * 1000)
  }
})