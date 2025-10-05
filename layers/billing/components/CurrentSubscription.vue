<template>
  <UCard class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Current Subscription
        </h2>
        <UBadge
          :color="getStatusColor(subscription.status)"
          variant="subtle"
          size="lg"
        >
          {{ subscription.status.replace('_', ' ').toUpperCase() }}
        </UBadge>
      </div>
    </template>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Plan Information -->
      <div class="space-y-4">
        <div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ subscription.plan.name }}
          </h3>
          <p class="text-3xl font-bold text-primary-600 mt-2">
            ${{ subscription.plan.price }}
            <span class="text-lg font-normal text-gray-600 dark:text-gray-400">
              /{{ subscription.plan.interval }}
            </span>
          </p>
        </div>

        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white mb-2">
            Plan Features
          </h4>
          <ul class="space-y-1">
            <li
              v-for="feature in subscription.plan.features"
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
          <div v-for="usage in usageStats" :key="usage.label" class="space-y-1">
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
          <p>Next billing: {{ formatDate(subscription.currentPeriodEnd) }}</p>
          <p v-if="subscription.cancelAtPeriodEnd" class="text-amber-600 dark:text-amber-400">
            ⚠️ Subscription will cancel at the end of the current period
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            @click="$emit('openPortal')"
            :loading="loading"
          >
            Change Plan
          </UButton>
          <UButton
            color="primary"
            @click="$emit('openPortal')"
            :loading="loading"
          >
            Manage Subscription
          </UButton>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface PlanInfo {
  name: string
  price: number
  interval: string
  features: string[]
}

interface UsageStats {
  label: string
  current: number
  limit: number
  percentage: number
}

interface Subscription {
  plan: PlanInfo
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface Props {
  subscription: Subscription
  usageStats: UsageStats[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<{
  openPortal: []
}>()

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