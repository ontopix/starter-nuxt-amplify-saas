import { createSharedComposable } from '@vueuse/core'

export interface StripePortalOptions {
  flow_type?: 'subscription_update' | 'subscription_cancel' | 'payment_method_update' | 'subscription_update_confirm'
  return_url?: string
  configuration_id?: string
  discount_id?: string
}

interface SubscriptionData {
  subscription: any
  plan: any
  paymentMethod: any
  usage: any[]
}

interface InvoicesData {
  invoices: any[]
  hasMore: boolean
  totalCount: number
}

// Base state: Use useState for SSR-safe, serializable shared state
const useBillingState = () => ({
  isPortalLoading: useState<boolean>('billing:isPortalLoading', () => false),
  subscription: useState<SubscriptionData | null>('billing:subscription', () => null),
  invoices: useState<InvoicesData | null>('billing:invoices', () => null),
  subscriptionLoading: useState<boolean>('billing:subscriptionLoading', () => false),
  invoicesLoading: useState<boolean>('billing:invoicesLoading', () => false),
  subscriptionError: useState<string | null>('billing:subscriptionError', () => null),
  invoicesError: useState<string | null>('billing:invoicesError', () => null),
  initialized: useState<boolean>('billing:initialized', () => false),
  inFlight: useState<Record<string, boolean>>('billing:inFlight', () => ({
    init: false,
    subscription: false,
    invoices: false,
    portal: false
  }))
})

// Core logic: Environment-agnostic where possible
const _useBilling = () => {
  const s = useBillingState()

  // Computed loading state
  const isLoading = computed(() =>
    s.isPortalLoading.value || s.subscriptionLoading.value || s.invoicesLoading.value
  )

  // Computed error state
  const error = computed(() =>
    s.subscriptionError.value || s.invoicesError.value
  )

  // Computed subscription state helpers
  const hasActivePaidSubscription = computed(() => {
    return s.subscription.value?.subscription?.status === 'active' &&
           s.subscription.value?.plan?.price > 0
  })

  const currentPlanId = computed(() => {
    return s.subscription.value?.subscription?.planId || 'free'
  })

  const isFreePlan = computed(() => {
    return currentPlanId.value === 'free' || s.subscription.value?.plan?.price === 0
  })

  // Create Stripe Customer Portal URL (no navigation)
  const createPortalUrl = async (options: StripePortalOptions = {}) => {
    const response = await $fetch('/api/billing/portal', {
      method: 'POST',
      body: {
        flow_type: options.flow_type || 'subscription_update',
        return_url: options.return_url,
        configuration_id: options.configuration_id,
        discount_id: options.discount_id
      }
    })

    if (!response.success || !response.data?.url) {
      throw new Error('No portal URL received')
    }

    return response.data.url as string
  }

  // Create Stripe Customer Portal session (returns full response)
  const createPortalSession = async (returnUrl?: string) => {
    const response = await $fetch('/api/billing/portal', {
      method: 'POST',
      body: {
        flow_type: 'subscription_update',
        return_url: returnUrl
      }
    })

    return response
  }

  // Create Stripe Checkout session
  // Supports two calling styles:
  // 1) createCheckoutSession({ priceId, planId, billingInterval })
  // 2) createCheckoutSession(priceId) — derives planId + interval by fetching plans
  const createCheckoutSession = async (
    arg1: { priceId: string, planId: string, billingInterval: 'monthly' | 'yearly' } | string,
    planIdMaybe?: string,
    billingIntervalMaybe?: 'monthly' | 'yearly'
  ) => {
    let priceId: string
    let planId: string
    let billingInterval: 'monthly' | 'yearly'

    if (typeof arg1 === 'string') {
      priceId = arg1

      // Derive planId and interval from public plans API
      const plansResp = await $fetch('/api/billing/plans') as any
      const plans = plansResp?.data?.plans || []
      const match = plans.find((p: any) => p.stripeMonthlyPriceId === priceId || p.stripeYearlyPriceId === priceId)

      if (!match) {
        throw new Error('Unknown priceId; not found in available plans')
      }

      planId = match.id
      billingInterval = match.stripeYearlyPriceId === priceId ? 'yearly' : 'monthly'
    } else {
      priceId = arg1.priceId
      planId = arg1.planId
      billingInterval = arg1.billingInterval
    }

    const response = await $fetch('/api/billing/checkout', {
      method: 'POST',
      body: {
        priceId,
        planId,
        billingInterval
      }
    })

    return response
  }

  // Portal functionality (navigate and refresh)
  const openPortal = async (options: StripePortalOptions = {}) => {
    if (s.isPortalLoading.value || s.inFlight.value.portal) return

    try {
      s.isPortalLoading.value = true
      s.inFlight.value.portal = true

      const url = await createPortalUrl(options)

      // Redirect to Stripe Customer Portal
      await navigateTo(url, { external: true })

      // Auto-refresh subscription data when user returns
      await nextTick()
      await refreshSubscription()

    } catch (error: any) {
      console.error('Portal error:', error)

      // Show error toast
      useToast().add({
        title: 'Portal Error',
        description: error.data?.message || error.message || 'Failed to open billing portal',
        color: 'red'
      })
    } finally {
      s.isPortalLoading.value = false
      s.inFlight.value.portal = false
    }
  }

  // Data fetching methods
  const fetchSubscription = async () => {
    if (s.subscriptionLoading.value || s.inFlight.value.subscription) return

    try {
      s.subscriptionLoading.value = true
      s.inFlight.value.subscription = true
      s.subscriptionError.value = null

      const response = await $fetch('/api/billing/subscription')

      if (response.success) {
        s.subscription.value = response.data
      } else {
        throw new Error('Failed to fetch subscription data')
      }

    } catch (error: any) {
      console.error('Subscription fetch error:', error)
      s.subscriptionError.value = error.data?.message || error.message || 'Failed to fetch subscription'

      useToast().add({
        title: 'Subscription Error',
        description: s.subscriptionError.value,
        color: 'red'
      })
    } finally {
      s.subscriptionLoading.value = false
      s.inFlight.value.subscription = false
    }
  }

  const fetchInvoices = async (options: { limit?: number, startingAfter?: string } = {}) => {
    if (s.invoicesLoading.value || s.inFlight.value.invoices) return

    try {
      s.invoicesLoading.value = true
      s.inFlight.value.invoices = true
      s.invoicesError.value = null

      const query = new URLSearchParams()
      if (options.limit) query.append('limit', options.limit.toString())
      if (options.startingAfter) query.append('startingAfter', options.startingAfter)

      const response = await $fetch(`/api/billing/invoices?${query.toString()}`)

      if (response.success) {
        if (options.startingAfter && s.invoices.value) {
          // Append to existing invoices (pagination)
          s.invoices.value.invoices.push(...response.data.invoices)
          s.invoices.value.hasMore = response.data.hasMore
        } else {
          // Replace invoices (initial load)
          s.invoices.value = response.data
        }
      } else {
        throw new Error('Failed to fetch invoices')
      }

    } catch (error: any) {
      console.error('Invoices fetch error:', error)
      s.invoicesError.value = error.data?.message || error.message || 'Failed to fetch invoices'

      useToast().add({
        title: 'Invoices Error',
        description: s.invoicesError.value,
        color: 'red'
      })
    } finally {
      s.invoicesLoading.value = false
      s.inFlight.value.invoices = false
    }
  }

  // Refresh methods
  const refreshSubscription = async () => {
    await fetchSubscription()
  }

  const refreshInvoices = async () => {
    s.invoices.value = null // Clear existing data
    await fetchInvoices()
  }

  const refreshAll = async () => {
    await Promise.all([
      refreshSubscription(),
      refreshInvoices()
    ])
  }

  // Convenience methods for portal flows (existing functionality)
  const updateSubscription = async (returnUrl?: string) => {
    await openPortal({
      flow_type: 'subscription_update',
      return_url: returnUrl
    })
  }

  const cancelSubscription = async (returnUrl?: string) => {
    await openPortal({
      flow_type: 'subscription_cancel',
      return_url: returnUrl
    })
  }

  const updatePaymentMethod = async (returnUrl?: string) => {
    await openPortal({
      flow_type: 'payment_method_update',
      return_url: returnUrl
    })
  }

  const confirmSubscriptionUpdate = async (discountId?: string, returnUrl?: string) => {
    await openPortal({
      flow_type: 'subscription_update_confirm',
      discount_id: discountId,
      return_url: returnUrl
    })
  }

  // Load more invoices (pagination)
  const loadMoreInvoices = async () => {
    if (!s.invoices.value?.hasMore || s.invoicesLoading.value) return

    const lastInvoice = s.invoices.value.invoices.slice(-1)[0]
    if (lastInvoice) {
      await fetchInvoices({
        limit: 10,
        startingAfter: lastInvoice.id
      })
    }
  }

  // Ensure one-time initialization
  const ensureInitialized = async () => {
    if (s.initialized.value || s.inFlight.value.init) return
    try {
      s.inFlight.value.init = true
      await Promise.all([
        fetchSubscription(),
        fetchInvoices({ limit: 10 })
      ])
      s.initialized.value = true
    } finally {
      s.inFlight.value.init = false
    }
  }

  // Auto-fetch once on first mount in client
  if (import.meta.client) {
    onMounted(() => {
      // Initialize data only once per client session
      // No-ops on subsequent mounts thanks to guards
      void ensureInitialized()
    })
  }

  return {
    // Data (readonly state from useState)
    subscription: readonly(s.subscription),
    invoices: readonly(s.invoices),

    // Loading states
    isLoading: readonly(isLoading),
    subscriptionLoading: readonly(s.subscriptionLoading),
    invoicesLoading: readonly(s.invoicesLoading),
    isPortalLoading: readonly(s.isPortalLoading),
    initialized: readonly(s.initialized),

    // Error states
    error: readonly(error),
    subscriptionError: readonly(s.subscriptionError),
    invoicesError: readonly(s.invoicesError),

    // Subscription state helpers
    hasActivePaidSubscription: readonly(hasActivePaidSubscription),
    currentPlanId: readonly(currentPlanId),
    isFreePlan: readonly(isFreePlan),

    // Portal methods
    createPortalUrl,
    createPortalSession,
    createCheckoutSession,
    openPortal,
    updateSubscription,
    cancelSubscription,
    updatePaymentMethod,
    confirmSubscriptionUpdate,

    // Data methods
    fetchSubscription,
    fetchInvoices,
    refreshSubscription,
    refreshInvoices,
    refreshAll,
    loadMoreInvoices,
    ensureInitialized
  }
}

// Client-shared export: Use createSharedComposable for efficiency on client
export const useBilling = createSharedComposable(_useBilling)

// Server-only export: Isolated instance per request (throw error if called on client)
export const useBillingServer = () => {
  if (import.meta.client) throw new Error('useBillingServer is server-only')
  return _useBilling()
}
