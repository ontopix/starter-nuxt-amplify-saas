<template>
  <div class="pricing-plans">
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <UPricingPlan
        v-for="plan in availablePlans"
        :key="plan.id"
        :title="plan.name"
        :description="plan.description"
        :price="formatPrice(plan.price)"
        :features="plan.features"
        :badge="plan.popular ? 'Most Popular' : undefined"
        :highlight="plan.popular"
        :scale="plan.popular"
        :button="{
          label: getButtonLabel(plan),
          disabled: isCurrentPlan(plan.id) || isLoading,
          loading: isLoading && selectedPlan === plan.id,
          color: plan.popular ? 'primary' : 'gray',
          variant: isCurrentPlan(plan.id) ? 'outline' : (plan.popular ? 'solid' : 'outline'),
          click: () => handleSubscribe(plan)
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SubscriptionPlan } from '../types'
import { formatPrice } from '../utils'

const { availablePlans, currentPlan, createAndRedirectToCheckout, isLoading, error, clearError } = useBilling()
const { createAndRedirectToCheckout: stripeCheckout } = useStripe()

const selectedPlan = ref<string | null>(null)

const isCurrentPlan = (planId: string): boolean => {
  return currentPlan.value?.id === planId
}

const getButtonLabel = (plan: SubscriptionPlan): string => {
  if (isCurrentPlan(plan.id)) {
    return 'Current Plan'
  }
  
  if (plan.id === 'free') {
    return 'Get Started Free'
  }
  
  return `Subscribe to ${plan.name}`
}

const handleSubscribe = async (plan: SubscriptionPlan) => {
  if (plan.id === 'free' || isCurrentPlan(plan.id)) {
    return
  }

  selectedPlan.value = plan.id
  clearError()

  try {
    const result = await stripeCheckout(plan.stripePriceId)
    
    if (!result.success) {
      console.error('Checkout failed:', result.error)
    }
  } catch (err) {
    console.error('Failed to start checkout:', err)
  } finally {
    selectedPlan.value = null
  }
}

// Clear any existing error when component mounts
onMounted(() => {
  clearError()
})
</script>