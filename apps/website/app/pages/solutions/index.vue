<script setup>
const { locale } = useI18n()
const { data: solutions } = await useAsyncData('solutions-' + locale.value, () => {
  return queryCollection('solutions_' + locale.value).all();
}, {
  watch: [locale],
})

// SEO Meta
useSeoMeta({
  title: $t('solutions.seo.title'),
  ogTitle: $t('solutions.seo.ogTitle'),
  description: $t('solutions.seo.description'),
  ogDescription: $t('solutions.seo.ogDescription'),
  ogImage: '/og.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UPageSection id="solutions" :title="$t('solutions.title')" :description="$t('solutions.subtitle')">
    <UContainer>

      <!-- Grid -->
      <UPageGrid v-if="solutions.length > 0">
        <UPageCard
          v-for="solution in solutions"
          :key="solution.title"
          :title="solution.title"
          :description="solution.description"
          :icon="solution.meta.icon"
          :spotlight="true"
          :to="$localePath(solution.path)"
          variant="soft"
        />
      </UPageGrid>

      <!-- No Results -->
      <div v-else class="text-center py-12">
        <UIcon name="heroicons:document-text" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('solutions.noResults') }}
        </h3>
      </div>

    </UContainer>
  </UPageSection>
</template>
