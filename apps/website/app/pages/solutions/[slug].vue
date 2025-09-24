<script setup>
const { locale } = useI18n()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()

// Fetch the solution content
const { data: solution } = await useAsyncData(`solutions-${locale.value}-${route.params.slug}`, () =>
  queryCollection(`solutions_${locale.value}`).path(route.path).first()
)

const { data: surround } = await useAsyncData(`solutions-${locale.value}-${route.params.slug}-surround`, () => {
  return queryCollectionItemSurroundings(`solutions_${locale.value}`, route.path, {
    fields: ['description']
  })
})

// SEO Meta
if (solution.value) {
  useSeoMeta({
    title: `${solution.value.title} - Ontopix Blog`,
    ogTitle: `${solution.value.title} - Ontopix Blog`,
    description: solution.value.description,
    ogDescription: solution.value.description,
    ogImage: solution.value.meta.image || '/og.png',
    twitterCard: 'summary_large_image'
  })
}

const fullUrl = computed(() => {
  return `${runtimeConfig.public.siteUrl || 'https://ontopix.ai'}${route.path}`
})

// 404 handling
if (process.server && !solution.value) {
  throw createError({
    statusCode: 404,
    statusMessage: $t('blog.notFound')
  })
}
</script>

<template>
  <!-- Article Headline Section -->
  <UPageSection :title="solution.title" :description="solution.description" :headline="$t('solutions.headline')">
    <UContainer class="max-w-4xl mx-auto">
      <!-- Featured Image -->
      <div v-if="solution.meta.image">
        <NuxtImg
          :src="solution.meta.image"
          :alt="solution.title"
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
              <div v-if="solution.body?.toc?.links?.length" class="mb-8">
                <UContentToc :links="solution.body?.toc?.links" />
              </div>

              <!-- Share Buttons -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t('solutions.shareSolution') }}
                </h3>
                <div class="flex space-x-3">
                  <UButton
                    :to="`https://twitter.com/intent/tweet?text=${encodeURIComponent(solution.title)}&url=${encodeURIComponent(fullUrl)}`"
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
              <ContentRenderer :value="solution" />
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
