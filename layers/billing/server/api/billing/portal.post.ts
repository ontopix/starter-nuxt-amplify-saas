import Stripe from 'stripe'
import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils'
import { getStripeCustomer } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

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

    // Get Stripe customer
    const customer = await getStripeCustomer(user.userId)
    
    if (!customer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No billing account found'
      })
    }

    const { returnUrl } = body

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: typeof customer === 'string' ? customer : customer.id,
      return_url: returnUrl || `${getHeader(event, 'origin')}/settings/billing`
    })

    return {
      success: true,
      data: {
        url: session.url
      }
    }

  } catch (error: any) {
    console.error('Portal error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create portal session'
    })
  }
})

