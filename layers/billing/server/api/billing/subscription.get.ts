import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils/middleware'
import { useUserServer } from '@starter-nuxt-amplify-saas/auth/composables/useUser'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    await requireAuth(event)

    // Get user data after authentication
    const { userProfile } = useUserServer()

    return {
      success: true,
      data: userProfile.value
    }

  } catch (error: any) {
    console.error('Subscription fetch error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch subscription'
    })
  }
})