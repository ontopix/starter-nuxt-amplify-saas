import Stripe from 'stripe'
import { runAmplifyApi } from '@starter-nuxt-amplify-saas/amplify/utils/server'
import { generateClient } from 'aws-amplify/data/server'
// Import removed - getPlanByPriceId function no longer needed

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey || !config.stripe?.webhookSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  try {
    const body = await readRawBody(event)
    const signature = getHeader(event, 'stripe-signature')

    if (!signature) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing Stripe signature'
      })
    }

    // Verify webhook signature
    const webhookEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    )

    console.log(`Received webhook: ${webhookEvent.type}`)

    // Handle different webhook events
    switch (webhookEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(webhookEvent.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(webhookEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(webhookEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(webhookEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(webhookEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(webhookEvent.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled webhook event: ${webhookEvent.type}`)
    }

    return { received: true }

  } catch (error: any) {
    console.error('Webhook error:', error)
    
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Webhook handling failed'
    })
  }
})

// Helper functions for database operations
async function getUserIdFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  try {
    // Note: This uses an admin query since webhooks don't have user context
    const client = generateClient({ authMode: 'apiKey' })
    const { data, errors } = await client.models.UserProfile.list({
      filter: { stripeCustomerId: { eq: stripeCustomerId } }
    })

    if (errors) {
      console.error('Error finding user from Stripe customer:', errors)
      return null
    }

    const profile = data[0]
    return profile?.userId || null
  } catch (error) {
    console.error('Error in getUserIdFromStripeCustomer:', error)
    return null
  }
}

async function updateUserProfile(userId: string, updates: { stripeCustomerId?: string; stripePriceId?: string; stripeProductId?: string }): Promise<boolean> {
  try {
    // Note: This uses an admin query since webhooks don't have user context
    const client = generateClient({ authMode: 'apiKey' })

    const { data, errors } = await client.models.UserProfile.update({
      userId: userId,
      ...updates
    })

    if (errors) {
      console.error('Error updating user profile:', errors)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    return false
  }
}

// Webhook handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  
  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Get the subscription from the session
  if (session.subscription) {
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription.id

    // Update user's profile in the database
    await updateUserProfile(userId, {
      stripeCustomerId: getCustomerId(session.customer) || undefined
    })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = await resolveCustomerToUser(subscription.customer, `subscription ${subscription.id}`)
  if (!userId) return

  const priceId = subscription.items.data[0]?.price?.id
  const customerId = getCustomerId(subscription.customer)

  await updateUserProfile(userId, {
    stripeCustomerId: customerId || undefined,
    stripePriceId: priceId,
    stripeProductId: subscription.items.data[0]?.price?.product as string || undefined
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await resolveCustomerToUser(subscription.customer, `subscription ${subscription.id}`)
  if (!userId) return

  const priceId = subscription.items.data[0]?.price?.id

  await updateUserProfile(userId, {
    stripePriceId: priceId,
    stripeProductId: subscription.items.data[0]?.price?.product as string || undefined
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await resolveCustomerToUser(subscription.customer, `subscription ${subscription.id}`)
  if (!userId) return

  // For subscription deleted, reset to free plan (empty price ID)
  await updateUserProfile(userId, {
    stripePriceId: '',
    stripeProductId: undefined
  })
}

// Common helper for resolving customer to user
async function resolveCustomerToUser(customer: string | Stripe.Customer | null, context: string): Promise<string | null> {
  const customerId = getCustomerId(customer)

  if (!customerId) {
    console.error(`Invalid customer data in ${context}`)
    return null
  }

  const userId = await getUserIdFromStripeCustomer(customerId)
  if (!userId) {
    console.error(`No user found for Stripe customer: ${customerId} in ${context}`)
    return null
  }

  return userId
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = await resolveCustomerToUser(invoice.customer, `invoice ${invoice.id}`)
  if (userId) {
    console.log(`Payment succeeded for user ${userId}, invoice ${invoice.id}`)
    // TODO: Send confirmation email, update payment status
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = await resolveCustomerToUser(invoice.customer, `invoice ${invoice.id}`)
  if (userId) {
    console.log(`Payment failed for user ${userId}, invoice ${invoice.id}`)
    // TODO: Send notification, handle failed payment
  }
}


// Helper function to safely extract customer ID from Stripe objects
function getCustomerId(customer: string | Stripe.Customer | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

