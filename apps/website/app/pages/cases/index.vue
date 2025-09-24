<script setup>
const { locale } = useI18n()
const { data: cases } = await useAsyncData('cases-' + locale.value, () => {
  return queryCollection('cases_' + locale.value).all();
}, {
  watch: [locale],
})

// SEO Meta
useSeoMeta({
  title: $t('cases.seo.title'),
  ogTitle: $t('cases.seo.ogTitle'),
  description: $t('cases.seo.description'),
  ogDescription: $t('cases.seo.ogDescription'),
  ogImage: '/og.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UPageSection id="articles" :title="$t('cases.title')" :description="$t('cases.subtitle')">
    <UContainer>

      <!-- Grid -->
      <UPageGrid v-if="cases.length > 0">
        <UPageCard
          v-for="usecase in cases"
          :key="usecase.title"
          :title="usecase.title"
          :description="usecase.description"
          :icon="usecase.meta.icon"
          :spotlight="true"
          :to="$localePath(usecase.path)"
          variant="soft"
        />
      </UPageGrid>

      <!-- No Results -->
      <div v-else class="text-center py-12">
        <UIcon name="heroicons:document-text" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('cases.noResults') }}
        </h3>
      </div>

    </UContainer>
  </UPageSection>
</template>
