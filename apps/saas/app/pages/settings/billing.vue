<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Billing Settings
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Manage your subscription and billing information
      </p>
    </div>

    <div class="space-y-6">
      <CurrentSubscription />
      <PaymentMethod />
      <InvoicesList />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

useSeoMeta({
  title: 'Billing Settings',
  description: 'Manage your subscription and billing information'
})

// Initialize billing data once when page mounts
const billing = useBilling()

onMounted(async () => {
  await billing.ensureInitialized()
})
</script>
