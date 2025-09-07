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

export const useBilling = () => {
  const { user, isAuthenticated } = useUser()

  const billingState = useState<BillingState>('billing.state', () => ({
    subscription: null,
    customer: null,
    isLoading: false,
    error: null
  }))

  const appConfig = useAppConfig()
  const availablePlans = computed(() => appConfig.billing?.plans || [])

  const currentPlan = computed(() => {
    if (!billingState.value.subscription) {
      return availablePlans.value.find(plan => plan.id === 'free') || null
    }
    
    return availablePlans.value.find(plan => plan.id === billingState.value.subscription?.planId) || null
  })

  const isActive = computed(() => isSubscriptionActive(billingState.value.subscription))
  const status = computed(() => getSubscriptionStatus(billingState.value.subscription))

  const canAccess = (planId: string): boolean => {
    const plan = availablePlans.value.find(p => p.id === planId)
    if (!plan) return false
    
    return canAccessFeature(billingState.value.subscription, plan)
  }

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

  const createPortalSession = async (returnUrl?: string): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: BillingPortalSession }>('/api/billing/portal', {
        method: 'POST',
        body: {
          returnUrl: returnUrl || `${window.location.origin}/settings/billing`
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

  const cancelSubscription = async (): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: UserSubscription }>('/api/billing/cancel', {
        method: 'POST'
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

  const resumeSubscription = async (): Promise<BillingResponse> => {
    if (!isAuthenticated.value) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      billingState.value.isLoading = true
      billingState.value.error = null

      const { data } = await $fetch<{ success: boolean; data: UserSubscription }>('/api/billing/resume', {
        method: 'POST'
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
    
    // Actions
    fetchSubscription,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
    resumeSubscription,
    fetchInvoices,
    fetchUsageMetrics,
    upgradeSubscription,
    canAccess,
    clearError
  }
}