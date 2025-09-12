import billingPlans from '@starter-nuxt-amplify-saas/billing/billing-plans.json'
import type { SubscriptionPlan } from '../types'

// ============ PLAN FUNCTIONS ============

/**
 * Get all available billing plans from configuration
 */
export function getAllPlans(): SubscriptionPlan[] {
  return billingPlans as SubscriptionPlan[]
}

/**
 * Get a specific plan by ID
 */
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return billingPlans.find(p => p.id === planId) as SubscriptionPlan | undefined
}

/**
 * Get Stripe price ID for a plan (throws if not found)
 */
export function getPlanPriceId(planId: string): string {
  const plan = getPlanById(planId)
  if (!plan?.stripePriceId) {
    throw new Error(`Plan '${planId}' not found or missing stripePriceId`)
  }
  return plan.stripePriceId
}

/**
 * Get the free plan specifically
 */
export function getFreePlan(): SubscriptionPlan | undefined {
  return getPlanById('free')
}

/**
 * Find plan by Stripe price ID (reverse lookup)
 */
export function getPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return billingPlans.find(plan => plan.stripePriceId === priceId) as SubscriptionPlan | undefined
}

/**
 * Check if a plan exists
 */
export function planExists(planId: string): boolean {
  return !!getPlanById(planId)
}

/**
 * Get plan features
 */
export function getPlanFeatures(planId: string): string[] {
  const plan = getPlanById(planId)
  return plan?.features || []
}

/**
 * Get plan limits
 */
export function getPlanLimits(planId: string): Record<string, any> {
  const plan = getPlanById(planId)
  return plan?.limits || {}
}

/**
 * Compare two plans for upgrade/downgrade logic
 */
export function comparePlans(planAId: string, planBId: string) {
  const planA = getPlanById(planAId)
  const planB = getPlanById(planBId)
  
  if (!planA || !planB) return null
  
  return {
    priceA: planA.price,
    priceB: planB.price,
    isUpgrade: planB.price > planA.price,
    isDowngrade: planB.price < planA.price,
    priceDifference: planB.price - planA.price
  }
}

