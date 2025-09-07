<template>
  <UButton
    :loading="isLoading"
    :disabled="disabled || isLoading"
    :color="color"
    :variant="variant"
    :size="size"
    :block="block"
    @click="handleCheckout"
  >
    <slot>
      {{ buttonText }}
    </slot>
  </UButton>
</template>

<script setup lang="ts">
interface Props {
  priceId: string
  planName?: string
  successUrl?: string
  cancelUrl?: string
  disabled?: boolean
  color?: string
  variant?: string
  size?: string
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  planName: 'this plan',
  successUrl: undefined,
  cancelUrl: undefined,
  disabled: false,
  color: 'primary',
  variant: 'solid',
  size: 'md',
  block: false
})

const emit = defineEmits<{
  checkout: [priceId: string]
  success: []
  error: [error: string]
}>()

const { createAndRedirectToCheckout } = useStripe()
const { isLoading, error, clearError } = useBilling()

const buttonText = computed(() => {
  return `Subscribe to ${props.planName}`
})

const handleCheckout = async () => {
  if (props.disabled) return

  emit('checkout', props.priceId)
  clearError()

  try {
    const result = await createAndRedirectToCheckout(
      props.priceId,
      props.successUrl,
      props.cancelUrl
    )

    if (result.success) {
      emit('success')
    } else {
      emit('error', result.error || 'Checkout failed')
    }
  } catch (err: any) {
    const errorMessage = err?.message || 'An unexpected error occurred'
    emit('error', errorMessage)
  }
}
</script>