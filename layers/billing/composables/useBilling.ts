import type { 
  BillingState, 
  UserSubscription, 
  StripeCustomer,
  BillingResponse,
  SubscriptionPlan,
  CheckoutSession,
  BillingPortalSession,
  InvoiceItem,
  UsageMetrics
} from '../types'
import { 
  isSubscriptionActive, 
  getSubscriptionStatus,
  canAccessFeature,
  handleBillingError 
} from '../utils'
import {
  getAllPlans
} from '../utils/billing'

/**
 * Composable for managing subscription billing and Stripe integration
 * 
 * Provides reactive state and methods for handling subscription management, billing plans,
 * Stripe integration, and usage tracking. This composable manages the complete billing lifecycle
 * including subscription creation, plan changes, portal access, and usage metrics.
 * 
 * @example Basic Subscription Management
 * ```ts
 * const { subscription, currentPlan, isActive, fetchSubscription } = useBilling()
 * 
 * // Check subscription status
 * await fetchSubscription()
 * if (isActive.value) {
 *   console.log(`Active ${currentPlan.value?.name} plan`) // 'Active Pro plan'
 * }
 * ```
 * 
 * @example Stripe Checkout Integration
 * ```ts
 * const { createCheckoutSession, availablePlans } = useBilling()
 * 
 * // Upgrade to Pro plan
 * const proPlan = availablePlans.value.find(p => p.id === 'pro')
 * if (proPlan?.stripePriceId) {
 *   const result = await createCheckoutSession(
 *     proPlan.stripePriceId,
 *     '/billing?success=true',
 *     '/billing?canceled=true'
 *   )
 *   if (result.success) {
 *     window.location.href = result.data.url
 *   }
 * }
 * ```
 * 
 * @example Customer Portal Access
 * ```ts
 * const { createPortalSession } = useBilling()
 * 
 * // Open Stripe Customer Portal
 * const result = await createPortalSession('/billing?portal=success', {
 *   locale: 'en',
 *   onBeforeRedirect: () => console.log('Opening portal...')
 * })
 * if (result.success) {
 *   window.location.href = result.data.url
 * }
 * ```
 * 
 * @example Plan Access Control
 * ```ts
 * const { canAccess, currentPlan } = useBilling()
 * 
 * // Check if user can access premium features
 * if (canAccess('pro')) {
 *   console.log('User has Pro access')
 * } else {
 *   console.log(`Current plan: ${currentPlan.value?.name}`)
 * }
 * ```
 * 
 * @returns {Object} Billing state and management methods
 * @property {ComputedRef<UserSubscription|null>} subscription - Current user subscription data
 * @property {ComputedRef<StripeCustomer|null>} customer - Stripe customer information  
 * @property {ComputedRef<boolean>} isLoading - Loading state for async operations
 * @property {ComputedRef<string|null>} error - Error message if operation fails
 * @property {ComputedRef<SubscriptionPlan[]>} availablePlans - All available billing plans
 * @property {ComputedRef<SubscriptionPlan|null>} currentPlan - User's current subscription plan
 * @property {ComputedRef<boolean>} isActive - Whether subscription is active
 * @property {ComputedRef<string>} status - Subscription status ('active', 'canceled', etc.)
 * @property {ComputedRef<boolean>} isPortalReady - Whether portal can be accessed
 * @property {Function} fetchSubscription - Fetch user's subscription data
 * @property {Function} createCheckoutSession - Create Stripe checkout session  
 * @property {Function} createPortalSession - Create Stripe customer portal session
 * @property {Function} cancelSubscription - Cancel user's subscription
 * @property {Function} resumeSubscription - Resume canceled subscription
 * @property {Function} fetchInvoices - Get user's billing invoices
 * @property {Function} fetchUsageMetrics - Get usage metrics for current period
 * @property {Function} upgradeSubscription - Upgrade to higher plan
 * @property {Function} canAccess - Check if user can access specific plan features
 * @property {Function} clearError - Clear current error state
 * @property {Function} getPortalStatus - Get portal accessibility status
 */
export const useBilling = () => {
  const { user, isAuthenticated } = useUser()

  const billingState = useState<BillingState>('billing.state', () => ({
    subscription: null,
    customer: null,
    isLoading: false,
    error: null
  }))

  const appConfig = useAppConfig()
  const availablePlans = computed(() => getAllPlans())

  const currentPlan = computed(() => {
    if (!billingState.value.subscription) {
      return availablePlans.value.find(plan => plan.id === 'free') || null
    }
    
    return availablePlans.value.find(plan => plan.id === billingState.value.subscription?.planId) || null
  })

  const isActive = computed(() => isSubscriptionActive(billingState.value.subscription))
  const status = computed(() => getSubscriptionStatus(billingState.value.subscription))

  /**
   * Check if user can access features from a specific plan
   * 
   * Determines whether the current user's subscription grants access to features
   * from the specified plan. This is useful for implementing feature gates and
   * conditional UI rendering based on subscription tier.
   * 
   * @param {string} planId - ID of the plan to check access for
   * @returns {boolean} True if user can access the plan's features
   * 
   * @example Feature Gating
   * ```ts
   * const { canAccess } = useBilling()
   * 
   * // Show premium features only to Pro users
   * const showAdvancedAnalytics = canAccess('pro')
   * if (showAdvancedAnalytics) {
   *   // Render premium analytics component
   * }
   * ```
   * 
   * @example Plan Comparison
   * ```ts
   * const { canAccess, currentPlan } = useBilling()
   * 
   * const plans = ['free', 'pro', 'enterprise']
   * const accessLevels = plans.map(planId => ({
   *   plan: planId,
   *   hasAccess: canAccess(planId),
   *   isCurrent: currentPlan.value?.id === planId
   * }))
   * ```
   */
  const canAccess = (planId: string): boolean => {
    const plan = availablePlans.value.find(p => p.id === planId)
    if (!plan) return false
    
    return canAccessFeature(billingState.value.subscription, plan)
  }

  /**
   * Fetch user's subscription data from the backend
   * 
   * Retrieves the current user's subscription information including plan details,
   * status, billing periods, and cancellation settings. Updates the reactive state
   * with the fetched data for immediate UI updates.
   * 
   * @returns {Promise<BillingResponse>} Response containing subscription data or error
   * 
   * @example
   * ```ts
   * const { fetchSubscription, subscription, currentPlan } = useBilling()
   * 
   * const result = await fetchSubscription()
   * if (result.success) {
   *   console.log(`Plan: ${currentPlan.value?.name}`)
   *   console.log(`Status: ${subscription.value?.status}`)
   * } else {
   *   console.error('Failed to fetch subscription:', result.error)
   * }
   * ```
   */
  const fetchSubscription = async (): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: UserSubscription | null }>('/api/billing/subscription', {
        method: 'GET'
      })

      billingState.value.subscription = data
      return { success: true, data }

    } catch (error: any) {
      const errorMessage = handleBillingError(error)
      billingState.value.error = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      billingState.value.isLoading = false
    }
  }

  /**
   * Create a Stripe checkout session for subscription purchase
   * 
   * Creates a Stripe checkout session that allows users to subscribe to a plan,
   * update their subscription, or add payment methods. The session handles
   * payment processing and redirects users back to the specified URLs.
   * 
   * @param {string} priceId - Stripe price ID for the subscription plan
   * @param {string} [successUrl] - URL to redirect after successful payment
   * @param {string} [cancelUrl] - URL to redirect if user cancels payment
   * @returns {Promise<BillingResponse>} Response containing checkout session URL
   * 
   * @example
   * ```ts
   * const { createCheckoutSession, availablePlans } = useBilling()
   * 
   * // Create checkout for Pro plan
   * const proPlan = availablePlans.value.find(p => p.id === 'pro')
   * const result = await createCheckoutSession(
   *   proPlan.stripePriceId,
   *   '/billing?success=true',
   *   '/billing?canceled=true'
   * )
   * 
   * if (result.success) {
   *   // Redirect to Stripe checkout
   *   window.location.href = result.data.url
   * }
   * ```
   */
  const createCheckoutSession = async (priceId: string, successUrl?: string, cancelUrl?: string): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: CheckoutSession }>('/api/billing/checkout', {
        method: 'POST',
        body: {
          priceId,
          successUrl: successUrl || `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: cancelUrl || `${window.location.origin}/settings/billing?canceled=true`
        }
      })

      return { success: true, data }

    } catch (error: any) {
      const errorMessage = handleBillingError(error)
      billingState.value.error = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      billingState.value.isLoading = false
    }
  }

  /**
   * Create a Stripe Customer Portal session for subscription management
   * 
   * Creates a secure portal session that allows customers to manage their subscriptions,
   * payment methods, billing history, and subscription changes. The portal is hosted
   * by Stripe and provides a secure, PCI-compliant interface for billing management.
   * 
   * @param {string} [returnUrl] - URL to redirect after portal session ends
   * @param {Object} [options] - Additional portal configuration options
   * @param {boolean} [options.skipSubscriptionCheck] - Skip checking for active subscription
   * @param {string} [options.locale] - Portal language locale (e.g., 'en', 'es', 'fr')
   * @param {Function} [options.onBeforeRedirect] - Callback before redirecting to portal
   * @returns {Promise<BillingResponse>} Response containing portal session URL and details
   * 
   * @example Basic Portal Access
   * ```ts
   * const { createPortalSession } = useBilling()
   * 
   * // Open customer portal
   * const result = await createPortalSession('/billing?portal=success')
   * if (result.success) {
   *   window.location.href = result.data.url
   * }
   * ```
   * 
   * @example Advanced Portal Configuration
   * ```ts
   * const result = await createPortalSession('/billing', {
   *   locale: 'es',
   *   onBeforeRedirect: () => {
   *     console.log('Opening Stripe portal...')
   *     gtag('event', 'portal_opened')
   *   }
   * })
   * ```
   * 
   * @example Portal Access Control
   * ```ts
   * // Allow portal access without active subscription
   * const result = await createPortalSession('/billing', {
   *   skipSubscriptionCheck: true
   * })
   * ```
   */
  const createPortalSession = async (
    returnUrl?: string, 
    options?: { 
      skipSubscriptionCheck?: boolean
      locale?: string
      onBeforeRedirect?: () => void
    }
  ): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check subscription status unless explicitly skipped
    if (!options?.skipSubscriptionCheck && !billingState.value.subscription) {
      // Try to fetch subscription first
      await fetchSubscription()
    }

    // Validate return URL for security
    const validatedReturnUrl = validatePortalReturnUrl(returnUrl)

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      // Prepare request body with enhanced options
      const requestBody = {
        returnUrl: validatedReturnUrl,
        ...(options?.locale && { locale: options.locale })
      }

      const { data } = await $fetch<{ success: boolean; data: BillingPortalSession }>('/api/billing/portal', {
        method: 'POST',
        body: requestBody
      })

      // Call optional callback before redirect
      if (options?.onBeforeRedirect) {
        options.onBeforeRedirect()
      }

      return { success: true, data }

    } catch (error: any) {
      const errorMessage = handleBillingError(error)
      billingState.value.error = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      billingState.value.isLoading = false
    }
  }



  const fetchInvoices = async (): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: InvoiceItem[] }>('/api/billing/invoices', {
        method: 'GET'
      })

      return { success: true, data }

    } catch (error: any) {
      const errorMessage = handleBillingError(error)
      billingState.value.error = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      billingState.value.isLoading = false
    }
  }

  const fetchUsageMetrics = async (): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: UsageMetrics }>('/api/billing/usage', {
        method: 'GET'
      })

      return { success: true, data }

    } catch (error: any) {
      const errorMessage = handleBillingError(error)
      billingState.value.error = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      billingState.value.isLoading = false
    }
  }

  const upgradeSubscription = async (priceId: string): Promise<BillingResponse> => {
    return await createCheckoutSession(priceId)
  }

  const clearError = () => {
    billingState.value.error = null
  }

  const isPortalReady = computed(() => {
    return isAuthenticated.value && billingState.value.subscription && isActive.value
  })

  const getPortalStatus = () => {
    if (!isAuthenticated.value) {
      return { ready: false, reason: 'User not authenticated' }
    }
    if (!billingState.value.subscription) {
      return { ready: false, reason: 'No subscription found' }
    }
    if (!isActive.value) {
      return { ready: false, reason: 'Subscription not active' }
    }
    return { ready: true, reason: 'Portal ready - plan catalog will be visible' }
  }


  return {
    // State
    subscription: computed(() => billingState.value.subscription),
    customer: computed(() => billingState.value.customer),
    isLoading: computed(() => billingState.value.isLoading),
    error: computed(() => billingState.value.error),
    
    // Computed
    availablePlans,
    currentPlan,
    isActive,
    status,
    isPortalReady,
    
    // Actions
    fetchSubscription,
    createCheckoutSession,
    createPortalSession,
    fetchInvoices,
    fetchUsageMetrics,
    upgradeSubscription,
    canAccess,
    clearError,
    getPortalStatus
  }
}

/**
 * Validate portal return URL for security
 * Ensures the URL is safe and belongs to the current origin
 */
function validatePortalReturnUrl(returnUrl?: string): string {
  // Default fallback URL
  const defaultUrl = `${window.location.origin}/settings/billing`
  
  if (!returnUrl) {
    return defaultUrl
  }
  
  try {
    const url = new URL(returnUrl)
    
    // Only allow same-origin URLs for security
    if (url.origin === window.location.origin) {
      return returnUrl
    } else {
      console.warn(`Invalid return URL rejected: ${returnUrl} (expected origin: ${window.location.origin})`)
      return defaultUrl
    }
  } catch (error) {
    console.warn(`Malformed return URL rejected: ${returnUrl}`)
    return defaultUrl
  }
}