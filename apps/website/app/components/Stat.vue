<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <UCard>
    <UIcon :name="icon" class="w-6 h-6 text-primary" />
    <p class="text-4xl md:text-5xl font-bold mb-2 text-gradient-violet">
      {{ value }}
    </p>
    <label class="text-sm text-gray-600 dark:text-gray-300 uppercase tracking-wide">
      {{ label }}
    </label>
  </UCard>
</template>
