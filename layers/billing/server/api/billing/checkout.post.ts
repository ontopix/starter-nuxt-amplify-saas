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

    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Price ID is required'
      })
    }

    // Create or get Stripe customer
    let customerRecord = await getStripeCustomer(user.userId)
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
      await saveStripeCustomer(user.userId, customer.id, user.email)
    } else {
      // Use existing customer
      customer = { id: customerRecord.stripeCustomerId }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.userId
      }
    })

    return {
      success: true,
      data: {
        url: session.url,
        sessionId: session.id
      }
    }

  } catch (error: any) {
    console.error('Checkout error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create checkout session'
    })
  }
})