import Stripe from 'stripe'
import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils/auth'
import { useUserServer } from '@starter-nuxt-amplify-saas/auth/composables/useUser'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  const { userAttributes, userProfile, fetchUser } = useUserServer()
  await fetchUser(event)

  const returnUrl = `${getHeader(event, 'origin') || 'http://localhost:3000'}/settings/billing`

  try {

    if (!userProfile.value?.stripeCustomerId) {
      throw new Error('No Stripe customer found - user registration may be incomplete')
    }

    const sessionOptions: Stripe.BillingPortal.SessionCreateParams = {
      customer: userProfile.value.stripeCustomerId,
      configuration: 'bpc_1SBCgZIz40uWL9cNb1rdCHOD',
      return_url: returnUrl
    }

    const session = await stripe.billingPortal.sessions.create(sessionOptions)

    return {
      success: true,
      data: {
        url: session.url,
        created: session.created,
        expires_at: session.created + 3600,
        customer: userProfile.value.stripeCustomerId
      }
    }

  } catch (error: any) {
    console.error('Portal API error:', {
      message: error.message,
      type: error.type,
      stack: error.stack
    })

    if (error.type === 'StripeInvalidRequestError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid billing request. Please contact support if this persists.'
      })
    }

    if (error.type === 'StripeRateLimitError') {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please wait a moment and try again.'
      })
    }

    if (error.type === 'StripeConnectionError') {
      throw createError({
        statusCode: 503,
        statusMessage: 'Billing service temporarily unavailable. Please try again in a few moments.'
      })
    }

    if (error.type === 'StripeAuthenticationError') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Billing service configuration error. Please contact support.'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to create billing portal session. Please try again or contact support.'
    })
  }
})
