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

export const useBilling = () => {
  // Shared state (SSR-friendly) using Nuxt useState
  const isPortalLoading = useState<boolean>('billing:isPortalLoading', () => false)

  const subscription = useState<SubscriptionData | null>('billing:subscription', () => null)
  const invoices = useState<InvoicesData | null>('billing:invoices', () => null)

  const subscriptionLoading = useState<boolean>('billing:subscriptionLoading', () => false)
  const invoicesLoading = useState<boolean>('billing:invoicesLoading', () => false)

  const subscriptionError = useState<string | null>('billing:subscriptionError', () => null)
  const invoicesError = useState<string | null>('billing:invoicesError', () => null)

  // Initialization and concurrency guards
  const initialized = useState<boolean>('billing:initialized', () => false)
  const inFlight = useState<Record<string, boolean>>('billing:inFlight', () => ({
    init: false,
    subscription: false,
    invoices: false,
    portal: false
  }))

  // Computed loading state
  const isLoading = computed(() =>
    isPortalLoading.value || subscriptionLoading.value || invoicesLoading.value
  )

  // Computed error state
  const error = computed(() =>
    subscriptionError.value || invoicesError.value
  )

  // Computed subscription state helpers
  const hasActivePaidSubscription = computed(() => {
    return subscription.value?.subscription?.status === 'active' &&
           subscription.value?.plan?.price > 0
  })

  const currentPlanId = computed(() => {
    return subscription.value?.subscription?.planId || 'free'
  })

  const isFreePlan = computed(() => {
    return currentPlanId.value === 'free' || subscription.value?.plan?.price === 0
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

  // Portal functionality (navigate and refresh)
  const openPortal = async (options: StripePortalOptions = {}) => {
    if (isPortalLoading.value || inFlight.value.portal) return

    try {
      isPortalLoading.value = true
      inFlight.value.portal = true

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
      isPortalLoading.value = false
      inFlight.value.portal = false
    }
  }

  // Data fetching methods
  const fetchSubscription = async () => {
    if (subscriptionLoading.value || inFlight.value.subscription) return

    try {
      subscriptionLoading.value = true
      inFlight.value.subscription = true
      subscriptionError.value = null

      const response = await $fetch('/api/billing/subscription')

      if (response.success) {
        subscription.value = response.data
      } else {
        throw new Error('Failed to fetch subscription data')
      }

    } catch (error: any) {
      console.error('Subscription fetch error:', error)
      subscriptionError.value = error.data?.message || error.message || 'Failed to fetch subscription'

      useToast().add({
        title: 'Subscription Error',
        description: subscriptionError.value,
        color: 'red'
      })
    } finally {
      subscriptionLoading.value = false
      inFlight.value.subscription = false
    }
  }

  const fetchInvoices = async (options: { limit?: number, startingAfter?: string } = {}) => {
    if (invoicesLoading.value || inFlight.value.invoices) return

    try {
      invoicesLoading.value = true
      inFlight.value.invoices = true
      invoicesError.value = null

      const query = new URLSearchParams()
      if (options.limit) query.append('limit', options.limit.toString())
      if (options.startingAfter) query.append('startingAfter', options.startingAfter)

      const response = await $fetch(`/api/billing/invoices?${query.toString()}`)

      if (response.success) {
        if (options.startingAfter && invoices.value) {
          // Append to existing invoices (pagination)
          invoices.value.invoices.push(...response.data.invoices)
          invoices.value.hasMore = response.data.hasMore
        } else {
          // Replace invoices (initial load)
          invoices.value = response.data
        }
      } else {
        throw new Error('Failed to fetch invoices')
      }

    } catch (error: any) {
      console.error('Invoices fetch error:', error)
      invoicesError.value = error.data?.message || error.message || 'Failed to fetch invoices'

      useToast().add({
        title: 'Invoices Error',
        description: invoicesError.value,
        color: 'red'
      })
    } finally {
      invoicesLoading.value = false
      inFlight.value.invoices = false
    }
  }

  // Refresh methods
  const refreshSubscription = async () => {
    await fetchSubscription()
  }

  const refreshInvoices = async () => {
    invoices.value = null // Clear existing data
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
    if (!invoices.value?.hasMore || invoicesLoading.value) return

    const lastInvoice = invoices.value.invoices.slice(-1)[0]
    if (lastInvoice) {
      await fetchInvoices({
        limit: 10,
        startingAfter: lastInvoice.id
      })
    }
  }

  // Ensure one-time initialization
  const ensureInitialized = async () => {
    if (initialized.value || inFlight.value.init) return
    try {
      inFlight.value.init = true
      await Promise.all([
        fetchSubscription(),
        fetchInvoices({ limit: 10 })
      ])
      initialized.value = true
    } finally {
      inFlight.value.init = false
    }
  }

  // Auto-fetch once on first mount in client
  onMounted(() => {
    // Initialize data only once per client session
    // No-ops on subsequent mounts thanks to guards
    void ensureInitialized()
  })

  return {
    // Data
    subscription: readonly(subscription),
    invoices: readonly(invoices),

    // Loading states
    isLoading: readonly(isLoading),
    subscriptionLoading: readonly(subscriptionLoading),
    invoicesLoading: readonly(invoicesLoading),
    isPortalLoading: readonly(isPortalLoading),
    initialized: readonly(initialized),

    // Error states
    error: readonly(error),
    subscriptionError: readonly(subscriptionError),
    invoicesError: readonly(invoicesError),

    // Subscription state helpers
    hasActivePaidSubscription: readonly(hasActivePaidSubscription),
    currentPlanId: readonly(currentPlanId),
    isFreePlan: readonly(isFreePlan),

    // Portal methods
    createPortalUrl,
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
    loadMoreInvoices
  }
}
