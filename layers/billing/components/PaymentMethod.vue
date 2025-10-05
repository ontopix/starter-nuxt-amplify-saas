<template>
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
            {{ paymentMethod.brand.toUpperCase() }} •••• {{ paymentMethod.last4 }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Expires {{ paymentMethod.expMonth }}/{{ paymentMethod.expYear }}
          </p>
        </div>
      </div>

      <UButton
        variant="outline"
        @click="$emit('openPortal')"
        :loading="loading"
      >
        Update
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface PaymentMethod {
  type: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface Props {
  paymentMethod: PaymentMethod
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<{
  openPortal: []
}>()
</script>