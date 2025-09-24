<script setup>
// SEO Meta
useSeoMeta({
  title: $t('start.seo.title'),
  ogTitle: $t('start.seo.ogTitle'),
  description: $t('start.seo.description'),
  ogDescription: $t('start.seo.ogDescription'),
  ogImage: '/og.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <UPageSection id="hero">
      <UContainer class="text-center max-w-4xl mx-auto">
        <h1 class="text-4xl md:text-6xl font-bold mb-6">
          {{ $t('start.title') }}
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          {{ $t('start.subtitle') }}
        </p>
        <p class="text-xl text-gradient-violet mb-8 max-w-2xl mx-auto">
          {{ $t('start.disclaimer') }}
        </p>
      </UContainer>
    </UPageSection>
  </div>
</template>
