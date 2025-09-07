import Stripe from 'stripe'
import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils'
import { getUserSubscription, updateUserSubscription } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe secret key not configured'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2024-12-18.acacia'
  })

  try {
    // Get authenticated user
    const user = await requireAuth(event)

    // Get user subscription
    const subscription = await getUserSubscription(user.userId)
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No active subscription found'
      })
    }

    // Cancel subscription at period end (don't immediately cancel)
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true
      }
    )

    // Update subscription in database
    const updatedUserSubscription = await updateUserSubscription(user.userId, {
      cancelAtPeriodEnd: true,
      status: updatedSubscription.status
    })

    return {
      success: true,
      data: updatedUserSubscription
    }

  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to cancel subscription'
    })
  }
})

