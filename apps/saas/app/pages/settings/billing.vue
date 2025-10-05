<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Billing Settings
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Manage your subscription and billing information
        </p>
      </div>
      <UButton
        icon="i-lucide-external-link"
        color="primary"
        variant="outline"
        size="lg"
        :loading="portalLoading"
        @click="openStripePortal"
      >
        Manage in Stripe
      </UButton>
    </div>

    <div class="space-y-6">
      <!-- Current Subscription Card -->
      <CurrentSubscription
        :subscription="mockSubscription"
        :usage-stats="mockUsage"
        :loading="portalLoading"
        @open-portal="openStripePortal"
      />

      <!-- Payment Method Card -->
      <PaymentMethod
        :payment-method="mockSubscription.paymentMethod"
        :loading="portalLoading"
        @open-portal="openStripePortal"
      />

      <!-- Billing History Card -->
      <BillingHistory
        :invoices="mockSubscription.invoices"
        :loading="portalLoading"
        @download-invoice="downloadInvoice"
        @view-all-invoices="openStripePortal"
      />

      <!-- Information Alert -->
      <UAlert
        color="blue"
        variant="soft"
        title="Portal-First Billing Management"
        description="All subscription changes, payment updates, and billing history are managed securely through Stripe's Customer Portal. This ensures the highest level of security and compliance for your billing information."
        icon="i-lucide-info"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

// Page title
useSeoMeta({
  title: 'Billing Settings',
  description: 'Manage your subscription and billing information'
})

// Composables
const { createPortalSession } = useBilling()

// Local state
const portalLoading = ref(false)

// Mocked subscription data - will be replaced with real data later
const mockSubscription = {
  plan: {
    name: 'Pro Plan',
    price: 29,
    interval: 'month',
    features: [
      'Unlimited projects',
      '10 team members',
      '100GB storage',
      'Priority support',
      'Advanced analytics',
      'Custom integrations'
    ]
  },
  status: 'active', // 'active', 'past_due', 'canceled', 'trialing'
  currentPeriodEnd: '2025-03-15',
  cancelAtPeriodEnd: false,
  paymentMethod: {
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2026
  },
  invoices: [
    {
      id: 'in_1234567890',
      number: 'ABC-001',
      date: '2025-02-15',
      amount: 29,
      status: 'paid'
    },
    {
      id: 'in_0987654321',
      number: 'ABC-002',
      date: '2025-01-15',
      amount: 29,
      status: 'paid'
    },
    {
      id: 'in_1122334455',
      number: 'ABC-003',
      date: '2024-12-15',
      amount: 29,
      status: 'paid'
    }
  ]
}

// Mocked usage data
const mockUsage = [
  {
    label: 'Projects',
    current: 7,
    limit: -1, // -1 means unlimited
    percentage: 0 // Will show as minimal usage
  },
  {
    label: 'Team Members',
    current: 4,
    limit: 10,
    percentage: 40
  },
  {
    label: 'Storage',
    current: 23,
    limit: 100,
    percentage: 23
  },
  {
    label: 'API Requests',
    current: 45600,
    limit: 100000,
    percentage: 45.6
  }
]

// Methods
const openStripePortal = async () => {
  portalLoading.value = true
  try {
    const result = await createPortalSession(
      `${window.location.origin}/settings/billing`
    )

    if (result.success && result.data?.url) {
      window.location.href = result.data.url
    } else {
      console.error('Failed to create portal session:', result.error)
    }
  } catch (error: any) {
    console.error('Portal opening failed:', error)
  } finally {
    portalLoading.value = false
  }
}

const downloadInvoice = async (invoiceId: string) => {
  // For now, redirect to Stripe portal where users can download invoices
  // In the future, this could be a direct download API call
  console.log('Download invoice:', invoiceId)
  await openStripePortal()
}
</script>