<template>
  <div class="subscription-status">
    <UDashboardCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Subscription Status
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your current subscription plan
            </p>
          </div>
          <UBadge 
            :color="getSubscriptionStatusColor(subscription)"
            variant="subtle"
            size="sm"
          >
            {{ getFormattedStatus() }}
          </UBadge>
        </div>
      </template>

      <!-- Status Overview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div v-if="currentPlan">
          <UDashboardCardContent>
            <template #title>
              Current Plan
            </template>
            <template #description>
              {{ currentPlan.name }}
              <span class="text-gray-500 dark:text-gray-400">
                ({{ formatPrice(currentPlan.price) }}/{{ currentPlan.interval }})
              </span>
            </template>
          </UDashboardCardContent>
        </div>

        <div v-if="subscription && subscription.currentPeriodEnd">
          <UDashboardCardContent>
            <template #title>
              {{ subscription.cancelAtPeriodEnd ? 'Expires on' : 'Next billing date' }}
            </template>
            <template #description>
              {{ formatDate(new Date(subscription.currentPeriodEnd)) }}
              <span v-if="getDaysUntilRenewal(subscription) > 0" class="text-gray-500">
                ({{ getDaysUntilRenewal(subscription) }} days)
              </span>
            </template>
          </UDashboardCardContent>
        </div>
      </div>

      <!-- Status Alerts -->
      <div class="space-y-4">
        <!-- Trial Info -->
        <UAlert
          v-if="subscription?.status === 'trialing'"
          color="blue" 
          variant="subtle"
          title="Free Trial Active"
          :description="`Your trial expires in ${getTrialDaysRemaining(subscription)} days.`"
          icon="i-lucide-info"
        />

        <!-- Cancellation Notice -->
        <UAlert
          v-if="subscription?.cancelAtPeriodEnd"
          color="amber" 
          variant="subtle"
          title="Subscription Canceling"
          description="Your subscription will not renew at the end of the current period."
          icon="i-lucide-alert-triangle"
        />

        <!-- Past Due Notice -->
        <UAlert
          v-if="subscription?.status === 'past_due'"
          color="red" 
          variant="subtle"
          title="Payment Required"
          description="Your payment is past due. Please update your payment method."
          icon="i-lucide-alert-circle"
        />
      </div>

      <template #footer>
        <div class="flex flex-wrap gap-3">
          <UButton
            v-if="subscription && isSubscriptionActive(subscription) && !subscription.cancelAtPeriodEnd"
            color="red"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            icon="i-lucide-x-circle"
            @click="handleCancelSubscription"
          >
            Cancel Subscription
          </UButton>
          
          <UButton
            v-if="subscription?.cancelAtPeriodEnd"
            color="green"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            icon="i-lucide-play-circle"
            @click="handleResumeSubscription"
          >
            Resume Subscription
          </UButton>
          
          <UButton
            v-if="subscription"
            color="gray"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            icon="i-lucide-external-link"
            @click="handleManageBilling"
          >
            Manage Billing
          </UButton>
        </div>
      </template>
    </UDashboardCard>
  </div>
</template>

<script setup lang="ts">
import { 
  formatPrice, 
  formatDate, 
  isSubscriptionActive,
  getSubscriptionStatusColor,
  getDaysUntilRenewal,
  getTrialDaysRemaining 
} from '../utils'

const { 
  subscription, 
  currentPlan, 
  isLoading,
  cancelSubscription,
  resumeSubscription,
  createPortalSession
} = useBilling()

const getFormattedStatus = (): string => {
  if (!subscription.value) return 'Free'
  
  const status = subscription.value.status
  
  switch (status) {
    case 'active':
      return subscription.value.cancelAtPeriodEnd ? 'Canceling' : 'Active'
    case 'trialing':
      return 'Trial'
    case 'past_due':
      return 'Past Due'
    case 'canceled':
      return 'Canceled'
    case 'unpaid':
      return 'Unpaid'
    case 'incomplete':
      return 'Incomplete'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

const handleCancelSubscription = async () => {
  const result = await cancelSubscription()
  if (result.success) {
    // Show success notification
    console.log('Subscription canceled successfully')
  }
}

const handleResumeSubscription = async () => {
  const result = await resumeSubscription()
  if (result.success) {
    // Show success notification
    console.log('Subscription resumed successfully')
  }
}

const handleManageBilling = async () => {
  const result = await createPortalSession()
  if (result.success && result.data?.url) {
    window.location.href = result.data.url
  }
}
</script>