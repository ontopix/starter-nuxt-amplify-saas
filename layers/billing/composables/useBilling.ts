import { createSharedComposable } from '@vueuse/core'
import {
  getAllPlans,
  getPlanByPriceId,
  isSubscriptionActive,
  getSubscriptionStatus,
  handleBillingError
} from '../utils'

interface UserProfile {
  id: string
  userId: string
  stripeCustomerId?: string
  stripeProductId?: string
  stripePriceId?: string
}

interface BillingPlan {
  id: string
  name: string
  description: string
  price: number
  stripePriceId: string
  features: string[]
}

/**
 * Simplified Billing Composable - Portal First Approach
 *
 * Provides minimal billing state management with maximum delegation
 * to Stripe Customer Portal for subscription management.
 */
const _useBilling = () => {
  const { isAuthenticated, userProfile: authUserProfile } = useUser()

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Use auth layer's userProfile as source of truth
  const userProfile = computed(() => authUserProfile.value)

  const availablePlans = computed(() => getAllPlans())

  const currentPlan = computed(() => {
    if (!userProfile.value?.stripePriceId) {
      return availablePlans.value.find(plan => plan.id === 'free') || null
    }

    return getPlanByPriceId(userProfile.value.stripePriceId) ||
           availablePlans.value.find(plan => plan.id === 'free') ||
           null
  })

  const isActive = computed(() => isSubscriptionActive(userProfile.value))

  const status = computed(() => getSubscriptionStatus(userProfile.value))

  /**
   * Fetch user's subscription data (delegates to auth layer)
   */
  const fetchSubscription = async (): Promise<{ success: boolean; error?: string; data?: any }> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const { data } = await $fetch<{ success: boolean; data: UserProfile | null }>('/api/billing/subscription', {
        method: 'GET'
      })

      return { success: true, data }

    } catch (err: any) {
      const errorMessage = handleBillingError(err)
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create Stripe Customer Portal session for subscription management
   */
  const createPortalSession = async (returnUrl?: string): Promise<{ success: boolean; error?: string; data?: any }> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const { data } = await $fetch<{ success: boolean; data: { url: string } }>('/api/billing/portal', {
        method: 'POST',
        body: {
          returnUrl: returnUrl || `${window.location.origin}/settings/billing`
        }
      })

      return { success: true, data }

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

  return {
    // State
    userProfile: computed(() => userProfile.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Computed
    availablePlans,
    currentPlan,
    isActive,
    status,

    // Methods
    fetchSubscription,
    createPortalSession,
    clearError
  }
}

export const useBilling = createSharedComposable(_useBilling)