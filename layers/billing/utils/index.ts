import type { SubscriptionPlan, UserSubscription } from '../types'

export const formatPrice = (amount: number, currency: string = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export const isSubscriptionActive = (subscription: UserSubscription | null): boolean => {
  if (!subscription) return false
  
  return ['active', 'trialing'].includes(subscription.status)
}

export const isSubscriptionCanceled = (subscription: UserSubscription | null): boolean => {
  if (!subscription) return false
  
  return subscription.status === 'canceled'
}

export const isSubscriptionPastDue = (subscription: UserSubscription | null): boolean => {
  if (!subscription) return false
  
  return subscription.status === 'past_due'
}

export const getSubscriptionStatus = (subscription: UserSubscription | null): string => {
  if (!subscription) return 'none'
  
  switch (subscription.status) {
    case 'active':
      return subscription.cancelAtPeriodEnd ? 'canceling' : 'active'
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

export const getSubscriptionStatusColor = (subscription: UserSubscription | null): string => {
  const status = getSubscriptionStatus(subscription)
  
  switch (status) {
    case 'active':
      return 'green'
    case 'trial':
      return 'blue'
    case 'canceling':
      return 'yellow'
    case 'past_due':
    case 'unpaid':
      return 'red'
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
      return 'gray'
    default:
      return 'gray'
  }
}

export const canAccessFeature = (subscription: UserSubscription | null, plan: SubscriptionPlan): boolean => {
  if (!subscription) return plan.id === 'free'
  
  if (!isSubscriptionActive(subscription)) return false
  
  return subscription.planId === plan.id
}

export const getDaysUntilRenewal = (subscription: UserSubscription | null): number => {
  if (!subscription) return 0
  
  const now = new Date()
  const endDate = new Date(subscription.currentPeriodEnd)
  const timeDiff = endDate.getTime() - now.getTime()
  
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

export const getTrialDaysRemaining = (subscription: UserSubscription | null): number => {
  if (!subscription || subscription.status !== 'trialing') return 0
  
  return getDaysUntilRenewal(subscription)
}

export const isFeatureLimitReached = (current: number, limit: number): boolean => {
  return current >= limit
}

export const getUsagePercentage = (current: number, limit: number): number => {
  if (limit === 0) return 0
  return Math.min((current / limit) * 100, 100)
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