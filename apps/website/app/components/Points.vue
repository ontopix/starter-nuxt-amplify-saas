<script setup>
defineProps({
  points: {
    type: Array,
    required: true
  }
})
</script>

<template>
  <ul class="space-y-3">
    <li v-for="point in points" :key="point" class="flex items-start space-x-3">
      <UIcon name="heroicons:check-circle" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
      <span class="text-gray-600 dark:text-gray-300">{{ point }}</span>
    </li>
  </ul>
</template>
