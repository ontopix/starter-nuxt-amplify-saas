import { loadStripe, type Stripe } from '@stripe/stripe-js'
import type { BillingResponse, CheckoutSession } from '../types'
import { handleBillingError } from '../utils'

export const useStripe = () => {
  const config = useRuntimeConfig()
  const publishableKey = config.public.stripe.publishableKey

  const stripeInstance = ref<Stripe | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

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