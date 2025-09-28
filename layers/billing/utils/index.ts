// ============ PLAN FUNCTIONS ============

interface BillingPlan {
  id: string
  name: string
  description: string
  price: number
  stripePriceId: string
  features: string[]
}

interface UserProfile {
  id: string
  userId: string
  stripeCustomerId?: string
  stripeProductId?: string
  stripePriceId?: string
}

/**
 * Get all available billing plans from app configuration
 */
export const getAllPlans = (): BillingPlan[] => {
  const appConfig = useAppConfig()
  return appConfig.billing.plans as BillingPlan[]
}

/**
 * Get a plan by ID
 */
export const getPlanById = (planId: string): BillingPlan | undefined => {
  const plans = getAllPlans()
  return plans.find(p => p.id === planId)
}

/**
 * Get a plan by Stripe price ID
 */
export const getPlanByPriceId = (priceId: string): BillingPlan | undefined => {
  const plans = getAllPlans()
  return plans.find(p => p.stripePriceId === priceId)
}

/**
 * Check if user has active subscription
 */
export const isSubscriptionActive = (userProfile: UserProfile | null): boolean => {
  if (!userProfile) return false
  return !!userProfile.stripePriceId
}

/**
 * Get subscription status
 */
export const getSubscriptionStatus = (userProfile: UserProfile | null): string => {
  if (!userProfile || !userProfile.stripePriceId) return 'none'

  const plan = getPlanByPriceId(userProfile.stripePriceId)
  return plan ? 'active' : 'unknown'
}

/**
 * Format price for display
 */
export const formatPrice = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Get the free plan
 */
export const getFreePlan = (): BillingPlan | undefined => {
  return getPlanById('free')
}

/**
 * Handle billing errors with user-friendly messages
 */
export const handleBillingError = (error: any): string => {
  if (error?.type === 'StripeCardError') {
    return error.message || 'Your payment was declined. Please try a different payment method.'
  }

  if (error?.type === 'StripeRateLimitError') {
    return 'Too many requests. Please try again later.'
  }

  if (error?.type === 'StripeInvalidRequestError') {
    return 'Invalid request. Please contact support.'
  }

  if (error?.type === 'StripeAPIError') {
    return 'Service error. Please try again later.'
  }

  if (error?.type === 'StripeConnectionError') {
    return 'Network error. Please check your connection and try again.'
  }

  if (error?.type === 'StripeAuthenticationError') {
    return 'Authentication error. Please contact support.'
  }

  return error?.message || 'An unexpected error occurred. Please try again.'
}