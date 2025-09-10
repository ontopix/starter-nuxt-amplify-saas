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
    // Note: Webhooks need special handling as they don't have user auth context
    await updateUserSubscription(null as any, userId, {
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: getCustomerId(session.customer) || undefined,
      status: 'active'
    })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = getCustomerId(subscription.customer)
  
  if (!customerId) {
    console.error('Invalid customer data in subscription:', subscription.id)
    return
  }
  
  const userId = await getUserIdFromStripeCustomer(null as any, customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  await updateUserSubscription(null as any, userId, {
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
  const customerId = getCustomerId(subscription.customer)
  
  if (!customerId) {
    console.error('Invalid customer data in subscription:', subscription.id)
    return
  }
  
  const userId = await getUserIdFromStripeCustomer(null as any, customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  await updateUserSubscription(null as any, userId, {
    status: subscription.status,
    planId: getPlanIdFromStripePrice(subscription.items.data[0]?.price?.id),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getCustomerId(subscription.customer)
  
  if (!customerId) {
    console.error('Invalid customer data in subscription:', subscription.id)
    return
  }
  
  const userId = await getUserIdFromStripeCustomer(null as any, customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  await updateUserSubscription(null as any, userId, {
    status: 'canceled'
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = getCustomerId(invoice.customer)
  
  if (!customerId) {
    console.error('Invalid customer data in invoice:', invoice.id)
    return
  }
  
  const userId = await getUserIdFromStripeCustomer(null as any, customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  // Update payment status, send confirmation email, etc.
  console.log(`Payment succeeded for user ${userId}, invoice ${invoice.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getCustomerId(invoice.customer)
  
  if (!customerId) {
    console.error('Invalid customer data in invoice:', invoice.id)
    return
  }
  
  const userId = await getUserIdFromStripeCustomer(null as any, customerId)
  
  if (!userId) {
    console.error('No user found for Stripe customer:', customerId)
    return
  }

  // Handle failed payment, send notification, etc.
  console.log(`Payment failed for user ${userId}, invoice ${invoice.id}`)
}


// Helper function to safely extract customer ID from Stripe objects
function getCustomerId(customer: string | Stripe.Customer | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function getPlanIdFromStripePrice(stripePriceId?: string): string {
  if (!stripePriceId) return 'free'
  
  // Load billing plans to map Stripe price IDs to plan IDs
  try {
    const billingPlans = [
      {
        "id": "free",
        "stripePriceId": "price_1S4grNEUWFhX2zZSWeGxNd96"
      },
      {
        "id": "pro",
        "stripePriceId": "price_1S4grOEUWFhX2zZS6ykHiUyQ"
      },
      {
        "id": "enterprise",
        "stripePriceId": "price_1S4grOEUWFhX2zZSJKVv45Rg"
      }
    ]
    
    const plan = billingPlans.find(p => p.stripePriceId === stripePriceId)
    
    if (plan) {
      console.log(`Mapped Stripe price ID ${stripePriceId} to plan: ${plan.id}`)
      return plan.id
    }
    
    console.warn(`Unknown Stripe price ID: ${stripePriceId}, falling back to 'free'`)
    return 'free'
    
  } catch (error) {
    console.error('Error mapping Stripe price ID to plan:', error)
    return 'free'
  }
}