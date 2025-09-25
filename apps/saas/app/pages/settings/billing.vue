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
      <UCard class="overflow-hidden">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Current Subscription
            </h2>
            <UBadge
              :color="getStatusColor(mockSubscription.status)"
              variant="subtle"
              size="lg"
            >
              {{ mockSubscription.status.replace('_', ' ').toUpperCase() }}
            </UBadge>
          </div>
        </template>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- Plan Information -->
          <div class="space-y-4">
            <div>
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ mockSubscription.plan.name }}
              </h3>
              <p class="text-3xl font-bold text-primary-600 mt-2">
                ${{ mockSubscription.plan.price }}
                <span class="text-lg font-normal text-gray-600 dark:text-gray-400">
                  /{{ mockSubscription.plan.interval }}
                </span>
              </p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">
                Plan Features
              </h4>
              <ul class="space-y-1">
                <li
                  v-for="feature in mockSubscription.plan.features"
                  :key="feature"
                  class="flex items-center text-sm text-gray-600 dark:text-gray-400"
                >
                  <UIcon name="i-lucide-check" class="w-4 h-4 text-green-600 mr-2" />
                  {{ feature }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Usage Stats -->
          <div class="space-y-4">
            <h4 class="font-semibold text-gray-900 dark:text-white">
              Current Usage
            </h4>

            <div class="space-y-3">
              <div v-for="usage in mockUsage" :key="usage.label" class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-400">{{ usage.label }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ usage.current }} / {{ usage.limit === -1 ? 'Unlimited' : usage.limit }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-300"
                    :class="usage.percentage > 80 ? 'bg-red-500' : usage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'"
                    :style="{ width: `${Math.min(usage.percentage, 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <p>Next billing: {{ formatDate(mockSubscription.currentPeriodEnd) }}</p>
              <p v-if="mockSubscription.cancelAtPeriodEnd" class="text-amber-600 dark:text-amber-400">
                ⚠️ Subscription will cancel at the end of the current period
              </p>
            </div>
            <div class="flex gap-2">
              <UButton
                variant="outline"
                @click="openStripePortal"
                :loading="portalLoading"
              >
                Change Plan
              </UButton>
              <UButton
                color="primary"
                @click="openStripePortal"
                :loading="portalLoading"
              >
                Manage Subscription
              </UButton>
            </div>
          </div>
        </template>
      </UCard>

      <!-- Payment Method Card -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-gray-600" />
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Payment Method
            </h2>
          </div>
        </template>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
              <UIcon name="i-lucide-credit-card" class="w-6 h-6 text-white" />
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ mockSubscription.paymentMethod.brand.toUpperCase() }} •••• {{ mockSubscription.paymentMethod.last4 }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Expires {{ mockSubscription.paymentMethod.expMonth }}/{{ mockSubscription.paymentMethod.expYear }}
              </p>
            </div>
          </div>

          <UButton
            variant="outline"
            @click="openStripePortal"
            :loading="portalLoading"
          >
            Update
          </UButton>
        </div>
      </UCard>

      <!-- Billing History Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-receipt" class="w-5 h-5 text-gray-600" />
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Invoices
              </h2>
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <div
            v-for="invoice in mockSubscription.invoices"
            :key="invoice.id"
            class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <UIcon name="i-lucide-file-text" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  Invoice #{{ invoice.number }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDate(invoice.date) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="font-semibold text-gray-900 dark:text-white">
                  ${{ invoice.amount }}
                </p>
                <UBadge
                  :color="invoice.status === 'paid' ? 'green' : invoice.status === 'pending' ? 'yellow' : 'red'"
                  variant="subtle"
                  size="sm"
                >
                  {{ invoice.status }}
                </UBadge>
              </div>

              <UButton
                variant="ghost"
                size="sm"
                icon="i-lucide-download"
                @click="openStripePortal"
              >
                Download
              </UButton>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-center">
            <UButton
              variant="ghost"
              @click="openStripePortal"
              :loading="portalLoading"
            >
              View All Invoices
            </UButton>
          </div>
        </template>
      </UCard>

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
  layout: 'dashboard'
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green'
    case 'trialing': return 'blue'
    case 'past_due': return 'yellow'
    case 'canceled': return 'red'
    default: return 'gray'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>