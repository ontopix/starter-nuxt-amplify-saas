<template>
  <div class="billing-portal">
    <UButton
      :loading="isLoading"
      :disabled="!subscription"
      color="gray"
      variant="outline"
      icon="i-lucide-external-link"
      size="sm"
      @click="openPortal"
    >
      Manage Billing
    </UButton>
  </div>
</template>

<script setup lang="ts">
interface Props {
  returnUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  returnUrl: undefined
})

const { subscription, createPortalSession, isLoading, error } = useBilling()

const openPortal = async () => {
  if (!subscription.value) {
    console.error('No active subscription found')
    return
  }

  const result = await createPortalSession(props.returnUrl)
  
  if (result.success && result.data?.url) {
    window.location.href = result.data.url
  } else {
    console.error('Failed to open billing portal:', result.error)
  }
}
</script>