import Stripe from 'stripe'
import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils'
import { getStripeCustomer, saveStripeCustomer } from '../../utils/database'

/**
 * Create Stripe Customer Portal Session
 * 
 * Following Stripe's best practices for Customer Portal integration:
 * - Authenticate users before creating sessions
 * - Validate return URLs for security
 * - Handle customer creation/retrieval robustly
 * - Provide comprehensive error handling
 * - Log operations for debugging and monitoring
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  // Validate Stripe configuration
  if (!config.stripe?.secretKey) {
    console.error('Portal session creation failed: Missing Stripe secret key')
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration incomplete. Please contact support.'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2024-12-18.acacia'
  })

  let user
  let customerRecord
  let stripeCustomer

  try {
    // Step 1: Authenticate user (required by Stripe best practices)
    user = await requireAuth(event)
    console.log(`Portal session requested by user: ${user.userId}`)

    // Step 2: Parse and validate request body
    const body = await readBody(event).catch(() => ({}))
    const { returnUrl, locale } = body

    // Step 3: Validate return URL for security
    const validatedReturnUrl = validateReturnUrl(returnUrl, event)

    // Step 4: Get or create Stripe customer
    customerRecord = await getStripeCustomer(event, user.userId)
    
    if (!customerRecord) {
      console.log(`Creating new Stripe customer for user: ${user.userId}`)
      
      // Create new Stripe customer with comprehensive data
      stripeCustomer = await stripe.customers.create({
        email: user.email || `${user.userId}@example.com`,
        name: user.displayName || user.email,
        metadata: {
          userId: user.userId,
          createdAt: new Date().toISOString(),
          source: 'billing_portal'
        },
        // Add preferred locale if provided
        ...(locale && { preferred_locales: [locale] })
      })
      
      // Save customer to database
      await saveStripeCustomer(event, user.userId, stripeCustomer.id, user.email)
      console.log(`Created Stripe customer: ${stripeCustomer.id} for user: ${user.userId}`)
    } else {
      // Verify existing customer still exists in Stripe
      try {
        stripeCustomer = await stripe.customers.retrieve(customerRecord.stripeCustomerId)
        
        // Check if customer was deleted
        if (stripeCustomer.deleted) {
          throw new Error('Customer was deleted in Stripe')
        }
        
        console.log(`Using existing Stripe customer: ${customerRecord.stripeCustomerId}`)
      } catch (customerError) {
        console.warn(`Stripe customer ${customerRecord.stripeCustomerId} not found, creating new one:`, customerError)
        
        // Create new customer if the old one doesn't exist
        stripeCustomer = await stripe.customers.create({
          email: user.email || `${user.userId}@example.com`,
          name: user.displayName || user.email,
          metadata: {
            userId: user.userId,
            createdAt: new Date().toISOString(),
            source: 'billing_portal_recreated',
            previousCustomerId: customerRecord.stripeCustomerId
          }
        })
        
        // Update database with new customer ID
        await saveStripeCustomer(event, user.userId, stripeCustomer.id, user.email)
        console.log(`Recreated Stripe customer: ${stripeCustomer.id} for user: ${user.userId}`)
      }
    }

    // Step 5: Create billing portal session with enhanced options
    const sessionOptions: Stripe.BillingPortal.SessionCreateParams = {
      customer: stripeCustomer.id,
      return_url: validatedReturnUrl,
      // Add locale support
      ...(locale && { locale: locale as Stripe.BillingPortal.SessionCreateParams.Locale })
    }

    console.log(`Creating portal session for customer: ${stripeCustomer.id}`)
    const session = await stripe.billingPortal.sessions.create(sessionOptions)

    // Log successful session creation
    console.log(`Portal session created successfully: ${session.id} for user: ${user.userId}`)

    return {
      success: true,
      data: {
        url: session.url,
        created: session.created,
        expires_at: session.created + 3600, // Sessions expire after 1 hour
        customer: stripeCustomer.id
      }
    }

  } catch (error: any) {
    // Enhanced error logging with context
    const errorContext = {
      userId: user?.userId,
      customerId: customerRecord?.stripeCustomerId || stripeCustomer?.id,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      stripeCode: error.code,
      stripeType: error.type
    }
    
    console.error('Portal session creation failed:', errorContext)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment method issue. Please update your payment information.'
      })
    }
    
    if (error.type === 'StripeRateLimitError') {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again in a moment.'
      })
    }
    
    if (error.type === 'StripeConnectionError') {
      throw createError({
        statusCode: 503,
        statusMessage: 'Payment service temporarily unavailable. Please try again.'
      })
    }
    
    // Generic error response (don't expose internal details)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to access billing portal. Please try again or contact support.'
    })
  }
})

/**
 * Validate and sanitize return URL for security
 * Following Stripe's security best practices
 */
function validateReturnUrl(returnUrl: string | undefined, event: any): string {
  const origin = getHeader(event, 'origin')
  const host = getHeader(event, 'host')
  const protocol = getHeader(event, 'x-forwarded-proto') || 'https'
  
  // Default fallback URL
  const defaultReturnUrl = `${protocol}://${host}/settings/billing`
  
  if (!returnUrl) {
    return defaultReturnUrl
  }
  
  try {
    const url = new URL(returnUrl)
    
    // Only allow same-origin URLs for security
    const allowedOrigin = origin || `${protocol}://${host}`
    
    if (url.origin === allowedOrigin) {
      return returnUrl
    } else {
      console.warn(`Invalid return URL rejected: ${returnUrl} (expected origin: ${allowedOrigin})`)
      return defaultReturnUrl
    }
  } catch (error) {
    console.warn(`Malformed return URL rejected: ${returnUrl}`)
    return defaultReturnUrl
  }
}

