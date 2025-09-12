import { loadStripe, type Stripe } from '@stripe/stripe-js'
import type { BillingResponse, CheckoutSession } from '../types'
import { handleBillingError } from '../utils'

/**
 * Composable for client-side Stripe integration and checkout management
 * 
 * Provides reactive state and methods for handling Stripe.js operations including
 * checkout session creation and redirects. This composable handles Stripe initialization,
 * checkout flows, and error management with proper client-side integration.
 * 
 * @example Basic Checkout Flow
 * ```ts
 * const { createAndRedirectToCheckout, isLoading, error } = useStripe()
 * 
 * // Redirect user to Stripe checkout
 * const handleUpgrade = async () => {
 *   const result = await createAndRedirectToCheckout(
 *     'price_1234567890abcdef',
 *     '/success',
 *     '/canceled'
 *   )
 *   // User will be redirected to Stripe Checkout
 * }
 * ```
 * 
 * @example Manual Checkout Session Handling
 * ```ts
 * const { redirectToCheckout, initStripe, stripeInstance } = useStripe()
 * 
 * // Custom checkout flow
 * const stripe = await initStripe()
 * if (stripe) {
 *   // Create session via API call
 *   const session = await $fetch('/api/billing/checkout', { ... })
 *   await redirectToCheckout(session.id)
 * }
 * ```
 * 
 * @example Error Handling
 * ```ts
 * const { createAndRedirectToCheckout, error, clearError } = useStripe()
 * 
 * const result = await createAndRedirectToCheckout(priceId)
 * if (!result.success) {
 *   console.error('Checkout failed:', error.value)
 *   // Clear error after handling
 *   clearError()
 * }
 * ```
 * 
 * @returns {Object} Stripe integration state and methods
 * @property {ComputedRef<Stripe|null>} stripeInstance - Initialized Stripe.js instance
 * @property {ComputedRef<boolean>} isLoading - Loading state for async operations
 * @property {ComputedRef<string|null>} error - Error message if operation fails
 * @property {Function} initStripe - Initialize Stripe.js instance
 * @property {Function} redirectToCheckout - Redirect to existing checkout session
 * @property {Function} createAndRedirectToCheckout - Create session and redirect to checkout
 * @property {Function} clearError - Clear current error state
 */
export const useStripe = () => {
  const config = useRuntimeConfig()
  const publishableKey = config.public.stripe.publishableKey

  const stripeInstance = ref<Stripe | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Initialize Stripe.js instance with publishable key
   * 
   * Loads and initializes the Stripe.js library using the configured publishable key.
   * This method is automatically called on component mount but can also be called manually.
   * The instance is cached and reused across calls for performance.
   * 
   * @returns {Promise<Stripe|null>} Initialized Stripe instance or null if initialization fails
   * 
   * @example Manual Initialization
   * ```ts
   * const { initStripe, stripeInstance } = useStripe()
   * 
   * const stripe = await initStripe()
   * if (stripe) {
   *   console.log('Stripe initialized:', stripeInstance.value)
   * } else {
   *   console.error('Failed to initialize Stripe')
   * }
   * ```
   * 
   * @example Using in Custom Components
   * ```ts
   * const { initStripe } = useStripe()
   * 
   * onMounted(async () => {
   *   const stripe = await initStripe()
   *   if (stripe) {
   *     // Stripe is ready for use
   *     setupCustomCheckout(stripe)
   *   }
   * })
   * ```
   */
  const initStripe = async (): Promise<Stripe | null> => {
    if (!publishableKey) {
      error.value = 'Stripe publishable key not configured'
      return null
    }

    if (stripeInstance.value) {
      return stripeInstance.value
    }

    try {
      isLoading.value = true
      error.value = null

      const stripe = await loadStripe(publishableKey)
      stripeInstance.value = stripe
      
      return stripe
    } catch (err: any) {
      const errorMessage = handleBillingError(err)
      error.value = errorMessage
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Redirect user to Stripe Checkout with existing session ID
   * 
   * Takes a pre-created checkout session ID and redirects the user to Stripe's
   * hosted checkout page. This method handles Stripe initialization and error management
   * automatically.
   * 
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Promise<BillingResponse>} Success/failure result with error details
   * 
   * @example Basic Checkout Redirect
   * ```ts
   * const { redirectToCheckout } = useStripe()
   * 
   * // After creating session server-side
   * const session = await $fetch('/api/billing/checkout', { ... })
   * const result = await redirectToCheckout(session.id)
   * 
   * if (result.success) {
   *   // User will be redirected to Stripe
   * } else {
   *   console.error('Redirect failed:', result.error)
   * }
   * ```
   * 
   * @example Error Handling
   * ```ts
   * const { redirectToCheckout, error } = useStripe()
   * 
   * try {
   *   await redirectToCheckout(sessionId)
   * } catch (err) {
   *   console.error('Checkout error:', error.value)
   * }
   * ```
   */
  const redirectToCheckout = async (sessionId: string): Promise<BillingResponse> => {
    try {
      isLoading.value = true
      error.value = null

      const stripe = await initStripe()
      if (!stripe) {
        return { success: false, error: 'Failed to initialize Stripe' }
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId })

      if (stripeError) {
        const errorMessage = handleBillingError(stripeError)
        error.value = errorMessage
        return { success: false, error: errorMessage }
      }

      return { success: true }

    } catch (err: any) {
      const errorMessage = handleBillingError(err)
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create checkout session and redirect user to Stripe Checkout
   * 
   * This is the primary method for subscription upgrades and purchases. It creates
   * a new Stripe checkout session server-side and immediately redirects the user
   * to the Stripe hosted checkout page. Handles the complete checkout flow including
   * session creation, initialization, and redirect.
   * 
   * @param {string} priceId - Stripe price ID for the subscription or product
   * @param {string} [successUrl] - URL to redirect after successful payment (defaults to billing page with success=true)
   * @param {string} [cancelUrl] - URL to redirect if user cancels (defaults to billing page with canceled=true)
   * @returns {Promise<BillingResponse>} Success/failure result with error details
   * 
   * @example Basic Subscription Upgrade
   * ```ts
   * const { createAndRedirectToCheckout, isLoading } = useStripe()
   * 
   * const handleUpgrade = async (planPriceId: string) => {
   *   const result = await createAndRedirectToCheckout(planPriceId)
   *   if (!result.success) {
   *     console.error('Upgrade failed:', result.error)
   *   }
   *   // User will be redirected to Stripe on success
   * }
   * ```
   * 
   * @example Custom Success/Cancel URLs
   * ```ts
   * const { createAndRedirectToCheckout } = useStripe()
   * 
   * await createAndRedirectToCheckout(
   *   'price_1234567890abcdef',
   *   'https://myapp.com/welcome?upgraded=true',
   *   'https://myapp.com/pricing?canceled=true'
   * )
   * ```
   * 
   * @example With Loading State
   * ```ts
   * const { createAndRedirectToCheckout, isLoading, error } = useStripe()
   * 
   * const upgradeUser = async () => {
   *   const result = await createAndRedirectToCheckout(priceId)
   *   
   *   if (!result.success) {
   *     // Handle error - user stays on current page
   *     showErrorMessage(error.value || 'Upgrade failed')
   *   }
   *   // Success means user was redirected to Stripe
   * }
   * ```
   */
  const createAndRedirectToCheckout = async (
    priceId: string, 
    successUrl?: string, 
    cancelUrl?: string
  ): Promise<BillingResponse> => {
    try {
      isLoading.value = true
      error.value = null

      // Create checkout session
      const checkoutResponse = await $fetch<{ success: boolean; data: CheckoutSession }>('/api/billing/checkout', {
        method: 'POST',
        body: {
          priceId,
          successUrl: successUrl || `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: cancelUrl || `${window.location.origin}/settings/billing?canceled=true`
        }
      })

      if (!checkoutResponse.success || !checkoutResponse.data) {
        return { success: false, error: 'Failed to create checkout session' }
      }

      // Redirect to checkout
      return await redirectToCheckout(checkoutResponse.data.sessionId)

    } catch (err: any) {
      const errorMessage = handleBillingError(err)
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear current error state
   * 
   * Resets the error state to null. Useful for clearing error messages after
   * they have been displayed or handled by the UI.
   * 
   * @example Error Management
   * ```ts
   * const { createAndRedirectToCheckout, error, clearError } = useStripe()
   * 
   * const handleCheckout = async () => {
   *   const result = await createAndRedirectToCheckout(priceId)
   *   
   *   if (!result.success) {
   *     // Show error to user
   *     showErrorNotification(error.value)
   *     // Clear error after displaying
   *     setTimeout(() => clearError(), 5000)
   *   }
   * }
   * ```
   * 
   * @example Manual Error Clearing
   * ```ts
   * const { error, clearError } = useStripe()
   * 
   * // Clear error when user dismisses error message
   * const dismissError = () => {
   *   clearError()
   * }
   * ```
   */
  const clearError = () => {
    error.value = null
  }

  // Initialize Stripe on client-side mount
  onMounted(() => {
    if (process.client) {
      initStripe()
    }
  })

  return {
    // State
    stripeInstance: readonly(stripeInstance),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Actions
    initStripe,
    redirectToCheckout,
    createAndRedirectToCheckout,
    clearError
  }
}