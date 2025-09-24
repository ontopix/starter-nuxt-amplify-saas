<script setup>
const { locale } = useI18n()
const { data: articles } = await useAsyncData('blog-articles-' + locale.value, () => {
  return queryCollection('blog_' + locale.value).order('path', 'DESC').all();
}, {
  watch: [locale],
})

// SEO Meta
useSeoMeta({
  title: $t('blog.seo.title'),
  ogTitle: $t('blog.seo.ogTitle'),
  description: $t('blog.seo.description'),
  ogDescription: $t('blog.seo.ogDescription'),
  ogImage: '/og.png',
  twitterCard: 'summary_large_image'
})

// Reactive state
const searchQuery = ref('')
const selectedTags = ref([])
const currentPage = ref(1)
const pageSize = 9

// Computed properties
const availableTags = computed(() => {
  const tags = new Set()
  if (articles.value) {
    articles.value.forEach(article => {
      if (article.meta.tags) {
        article.meta.tags.forEach(tag => tags.add(tag))
      }
    })
  }
  return Array.from(tags).sort()
})

const filteredArticles = computed(() => {
  let filtered = articles.value || []

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.description.toLowerCase().includes(query)
    )
  }

  // Filter by selected tags
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter(article =>
      article.meta.tags && article.meta.tags.some(tag => selectedTags.value.includes(tag))
    )
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredArticles.value.length / pageSize))

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredArticles.value.slice(start, end)
})

// Methods
function toggleTag(tag) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
  currentPage.value = 1 // Reset to first page when filtering
}

// Reset page when search changes
watch(searchQuery, () => {
  currentPage.value = 1
})
</script>

<template>
  <UPageSection id="articles" :title="$t('blog.title')" :description="$t('blog.subtitle')">
    <UContainer>
      <!-- Search and Filters -->
      <div class="flex flex-row flex-wrap gap-4 mb-12">
        <UInput
          v-model="searchQuery"
          icon="heroicons:magnifying-glass"
          :placeholder="$t('blog.searchPlaceholder')"
          size="lg"
          class="grow"
        />
        <div class="flex gap-1 flex-wrap">
          <UButton
            v-for="tag in availableTags"
            :key="tag"
            :variant="selectedTags.includes(tag) ? 'solid' : 'outline'"
            :color="selectedTags.includes(tag) ? 'secondary' : 'neutral'"
            size="sm"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </UButton>
        </div>
        <USeparator
          v-if="filteredArticles.length > 0 && filteredArticles.length !== articles.length"
          :label="filteredArticles.length + ' ' + $t('blog.results')"
        />
      </div>

      <!-- Articles Grid -->
      <UBlogPosts v-if="filteredArticles.length > 0">
        <UBlogPost
          v-for="article in paginatedArticles"
          :key="article.path"
          :to="$localePath(article.path)"
          :image="article.meta.image"
          :badge="article.meta.badge"
          :date="article.meta.date"
          :title="article.title"
          :description="article.description"
          :authors="article.meta.authors"
          :tags="article.meta.tags"
          variant="subtle"
        >
          <template #footer>
            <div class="px-4 sm:px-6 mb-4">
              <UBadge
                v-for="tag in article.meta.tags"
                :key="tag"
                :label="tag"
                :color="selectedTags.includes(tag) ? 'secondary' : 'transparent'"
                :variant="selectedTags.includes(tag) ? 'outline' : 'ghost'"
                icon="heroicons:tag"
                size="sm"
              />
            </div>
          </template>
        </UBlogPost>
      </UBlogPosts>

      <!-- No Results -->
      <div v-else class="text-center py-12">
        <UIcon name="heroicons:document-text" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('blog.noResults') }}
        </h3>
        <p class="text-gray-600 dark:text-gray-300">
          {{ $t('blog.tryAdjusting') }}
        </p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center m-6 sm:p-8">
        <UPagination
          v-model:page="currentPage"
          :items-per-page="pageSize"
          :total="filteredArticles.length"
          :show-controls="false"
          :show-edges="false"
        />
      </div>
    </UContainer>

    <!-- Warm up all images -->
    <div class="hidden">
      <NuxtImg v-for="a in articles" :key="a.stem" :src="a.meta.image" />
    </div>
  </UPageSection>
</template>
