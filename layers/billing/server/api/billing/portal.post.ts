import Stripe from 'stripe'
import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils'
import { getStripeCustomer, saveStripeCustomer } from '../../utils/database'

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

    // Create or get Stripe customer
    let customerRecord = await getStripeCustomer(event, user.userId)
    let customer
    
    if (!customerRecord) {
      // Create new Stripe customer
      customer = await stripe.customers.create({
        email: user.email || user.userId,
        metadata: {
          userId: user.userId
        }
      })
      
      // Save customer to database
      await saveStripeCustomer(event, user.userId, customer.id, user.email)
    } else {
      // Use existing customer
      customer = { id: customerRecord.stripeCustomerId }
    }

    const { returnUrl } = body

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
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

