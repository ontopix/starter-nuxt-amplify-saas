<script setup>
const { locale } = useI18n()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()

// Fetch the article content
const { data: article } = await useAsyncData(`blog-${locale.value}-${route.params.slug}`, () =>
  queryCollection(`blog_${locale.value}`).path(route.path).first()
)

const { data: surround } = await useAsyncData(`blog-${locale.value}-${route.params.slug}-surround`, () => {
  return queryCollectionItemSurroundings(`blog_${locale.value}`, route.path, {
    fields: ['description']
  }).order('path', 'DESC')
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

// Computed properties
const readingTime = computed(() => {
  if (!article.value?.body) return 0
  const wordsPerMinute = 200
  const wordCount = JSON.stringify(article.value.body).split(' ').length
  return Math.ceil(wordCount / wordsPerMinute)
})

const fullUrl = computed(() => {
  return `${runtimeConfig.public.siteUrl || 'https://ontopix.ai'}${route.path}`
})

// Methods
function formatDate(date) {
  return new Date(date).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

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
  <UPageSection :title="article.title" :description="article.description">
    <UContainer class="max-w-4xl mx-auto">
        <!-- Article Header -->
        <div class="my-2 flex items-center justify-center flex-wrap space-x-4 text-neutral-500">
          <span v-for="author in article.meta.authors" :key="author.name">
            {{ author.name }}
          </span>
          <span>•</span>
          <span>{{ formatDate(article.meta.date) }}</span>
          <span>•</span>
          <span>{{ readingTime }} min read</span>
        </div>
        <div class="my-2 flex items-center justify-center flex-wrap space-x-4">
          <UBadge
            v-for="tag in article.meta.tags"
            :key="tag"
            :label="tag"
            icon="heroicons:tag"
            color="neutral"
            variant="outline"
          />
        </div>
        <!-- Featured Image -->
        <div v-if="article.meta.image" class="mt-12">
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
                  {{ $t('blog.shareArticle') }}
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

            <!-- Author Bio -->
            <div class="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl flex gap-4">
              <UUser
                v-for="author in article.meta.authors"
                :key="author.name"
                :name="author.name"
                :description="author.description"
                :avatar="author.avatar"
              />
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
