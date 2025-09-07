import Stripe from 'stripe'
import { updateUserSubscription, getUserIdFromStripeCustomer } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey || !config.stripe?.webhookSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2024-12-18.acacia'
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

// Webhook handlers - these need to be implemented based on your database schema
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

    // Update user's subscription in your database
    await updateUserSubscription(userId, {
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: session.customer as string,
      status: 'active'
    })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  await updateUserSubscription(userId, {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status,
    planId: getPlanIdFromStripePrice(subscription.items.data[0]?.price?.id),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  await updateUserSubscription(userId, {
    status: subscription.status,
    planId: getPlanIdFromStripePrice(subscription.items.data[0]?.price?.id),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  await updateUserSubscription(userId, {
    status: 'canceled'
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  // Update payment status, send confirmation email, etc.
  console.log(`Payment succeeded for user ${userId}, invoice ${invoice.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  // Handle failed payment, send notification, etc.
  console.log(`Payment failed for user ${userId}, invoice ${invoice.id}`)
}


function getPlanIdFromStripePrice(stripePriceId?: string): string {
  if (!stripePriceId) return 'free'
  
  // Note: In a real app, you'd want to load this from your app config or database
  // For now, we'll return 'pro' for any valid price ID and 'free' as fallback
  // TODO: Implement proper mapping from billing-plans.json
  
  // For debugging, log the price ID we're trying to map
  console.log('Mapping Stripe price ID to plan:', stripePriceId)
  
  return 'pro' // Temporary fallback - should be improved
}