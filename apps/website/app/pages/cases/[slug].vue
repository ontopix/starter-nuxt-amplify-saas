<script setup>
const { locale } = useI18n()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()

// Fetch the article content
const { data: article } = await useAsyncData(`cases-${locale.value}-${route.params.slug}`, () =>
  queryCollection(`cases_${locale.value}`).path(route.path).first()
)

const { data: surround } = await useAsyncData(`cases-${locale.value}-${route.params.slug}-surround`, () => {
  return queryCollectionItemSurroundings(`cases_${locale.value}`, route.path, {
    fields: ['description']
  })
})

// SEO Meta
if (article.value) {
  useSeoMeta({
    title: `${article.value.title} - Ontopix Blog`,
    ogTitle: `${article.value.title} - Ontopix Blog`,
    description: article.value.description,
    ogDescription: article.value.description,
    ogImage: article.value.meta.image || '/og.png',
    twitterCard: 'summary_large_image'
  })
}

const fullUrl = computed(() => {
  return `${runtimeConfig.public.siteUrl || 'https://ontopix.ai'}${route.path}`
})

// 404 handling
if (process.server && !article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: $t('blog.notFound')
  })
}
</script>

<template>
  <!-- Article Headline Section -->
  <UPageSection :title="article.title" :description="article.description" :headline="$t('cases.headline')">
    <UContainer class="max-w-4xl mx-auto">
      <!-- Featured Image -->
      <div v-if="article.meta.image">
        <NuxtImg
          :src="article.meta.image"
          :alt="article.title"
          class="w-full rounded-2xl shadow-lg"
          width="800" height="400"
        />
      </div>
    </UContainer>
  </UPageSection>

  <!-- Article Content -->
  <UPageSection>
    <UContainer>
      <div class="max-w-4xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <!-- Table of Contents -->
          <div class="lg:col-span-1">
            <div class="sticky top-12">
              <div v-if="article.body?.toc?.links?.length" class="mb-8">
                <UContentToc :links="article.body?.toc?.links" />
              </div>

              <!-- Share Buttons -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t('cases.shareUseCase') }}
                </h3>
                <div class="flex space-x-3">
                  <UButton
                    :to="`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(fullUrl)}`"
                    color="neutral"
                    variant="outline"
                    target="_blank"
                    external
                  >
                    <UIcon name="simple-icons:x" />
                  </UButton>
                  <UButton
                    :to="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`"
                    color="neutral"
                    variant="outline"
                    target="_blank"
                    external
                  >
                    <UIcon name="simple-icons:linkedin" />
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Article Body -->
          <div class="lg:col-span-3">
            <div class="prose prose-lg dark:prose-invert max-w-none">
              <ContentRenderer :value="article" />
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </UPageSection>

  <!-- Navigation -->
  <UPageSection>
    <UContainer>
      <UContentSurround :surround="surround" />
    </UContainer>
  </UPageSection>

</template>
