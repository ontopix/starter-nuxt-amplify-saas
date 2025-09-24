import type { SubscriptionPlan, UserProfile } from '../types'

/**
 * Format price using i18n-aware formatting
 * @param amount - Amount in cents
 * @param currency - Currency code (legacy parameter, now uses i18n config)
 * @returns Formatted price string
 */
export const formatPrice = (amount: number, currency: string = 'usd'): string => {
  // Try to use i18n formatting if available
  if (process.client && window.nuxtApp?.$n) {
    try {
      return window.nuxtApp.$n(amount / 100, 'currency')
    } catch (error) {
      // Fall through to fallback
    }
  }
  
  // Fallback for SSR or when i18n is not available  
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

/**
 * Format date using i18n-aware formatting
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  // Try to use i18n formatting if available
  if (process.client && window.nuxtApp?.$d) {
    try {
      return window.nuxtApp.$d(date, 'short')
    } catch (error) {
      // Fall through to fallback
    }
  }
  
  // Fallback for SSR or when i18n is not available
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
  }).format(date)
}

export const isSubscriptionActive = (userProfile: UserProfile | null): boolean => {
  if (!userProfile || !userProfile.system) return false

  return ['active', 'trialing'].includes(userProfile.system.billingStatus)
}

export const getSubscriptionStatus = (userProfile: UserProfile | null): string => {
  if (!userProfile || !userProfile.system) return 'none'

  switch (userProfile.system.billingStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trial'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'unpaid':
      return 'unpaid'
    case 'incomplete':
      return 'incomplete'
    case 'incomplete_expired':
      return 'incomplete_expired'
    case 'paused':
      return 'paused'
    default:
      return 'unknown'
  }
}

export const canAccessFeature = (userProfile: UserProfile | null, plan: SubscriptionPlan): boolean => {
  if (!userProfile || !userProfile.system) return plan.id === 'free'

  if (!isSubscriptionActive(userProfile)) return false

  return userProfile.system.planId === plan.id
}

export const handleBillingError = (error: any): string => {
  if (error?.type === 'StripeCardError') {
    return error.message || 'Your payment was declined. Please try a different payment method.'
  }
  
  if (error?.type === 'StripeRateLimitError') {
    return 'Too many requests made to Stripe. Please try again later.'
  }
  
  if (error?.type === 'StripeInvalidRequestError') {
    return 'Invalid request to Stripe. Please contact support.'
  }
  
  if (error?.type === 'StripeAPIError') {
    return 'An error occurred with Stripe. Please try again later.'
  }
  
  if (error?.type === 'StripeConnectionError') {
    return 'Network error connecting to Stripe. Please check your connection and try again.'
  }
  
  if (error?.type === 'StripeAuthenticationError') {
    return 'Authentication error with Stripe. Please contact support.'
  }
  
  return error?.message || 'An unexpected error occurred. Please try again.'
}