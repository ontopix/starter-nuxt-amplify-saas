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
  if (!plan?.prices?.[0]?.stripePriceId) {
    throw new Error(`Plan '${planId}' not found or missing stripePriceId`)
  }
  return plan.prices[0].stripePriceId
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
  return billingPlans.find(plan =>
    plan.prices?.some(price => price.stripePriceId === priceId)
  ) as SubscriptionPlan | undefined
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
 * Get plan entitlements
 */
export function getPlanEntitlements(planId: string): Record<string, number | boolean | string> {
  const plan = getPlanById(planId)
  return plan?.entitlements || {}
}

/**
 * Compare two plans for upgrade/downgrade logic
 */
export function comparePlans(planAId: string, planBId: string) {
  const planA = getPlanById(planAId)
  const planB = getPlanById(planBId)

  if (!planA || !planB) return null

  // Use first price for comparison
  const priceA = planA.prices?.[0]?.unitAmount || 0
  const priceB = planB.prices?.[0]?.unitAmount || 0

  return {
    priceA,
    priceB,
    isUpgrade: priceB > priceA,
    isDowngrade: priceB < priceA,
    priceDifference: priceB - priceA
  }
}

