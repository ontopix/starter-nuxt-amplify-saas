import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils'
import { getUserSubscription } from '../../utils/database'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await requireAuth(event)

    // Get user subscription from database
    const subscription = await getUserSubscription(user.userId)

    return {
      success: true,
      data: subscription
    }

  } catch (error: any) {
    console.error('Subscription fetch error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch subscription'
    })
  }
})