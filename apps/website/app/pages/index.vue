<script setup>
const { locale } = useI18n()
const { data: content } = await useAsyncData('landing-content-' + locale.value, () => {
  return queryCollection('landing_' + locale.value).first();
}, {
  watch: [locale],
})

const steps = content.value?.meta.steps || []
const testimonials = content.value?.meta.testimonials || []
const faqs = content.value?.meta.faqs || []
const reasons = content.value?.meta.reasons || []
const features = content.value?.meta.features || []
const stats = content.value?.meta.stats || []
const hero = content.value?.meta.hero || {}
const cta = content.value?.meta.cta || {}

// SEO Meta
const seo = content.value?.meta.seo || {}
if (seo) {
  useSeoMeta(seo)
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <UPageSection id="hero" class="bg-gradient-violet">
      <UContainer class="text-center max-w-4xl mx-auto fade-in-up">
        <h1 class="text-4xl md:text-6xl font-bold mb-6">
          {{ hero.titleTransform }}
          <span class="text-gradient-violet lg:text-nowrap">
            {{ hero.titleAgents }}
          </span>
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          {{ hero.description }}
        </p>
        <div class="flex gap-4 justify-center flex-wrap">
          <UButton
            v-for="button in hero.links"
            :key="button.label"
            :to="button.to"
            :variant="button.variant"
            :color="button.color"
            size="xl"
            class="px-8"
          >
            {{ button.label }} <UIcon v-if="button.icon" :name="button.icon" class="ml-2" />
          </UButton>
        </div>
        <div class="mt-12 flex justify-center items-center">
          <NuxtImg
            :src="hero.image"
            :alt="hero.imageAlt"
            class="rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
            width="800" height="500"
          />
        </div>
      </UContainer>
    </UPageSection>

    <!-- Reasons Section -->
    <UPageSection id="reasons" :title="reasons.title" :description="reasons.description">
      <UContainer>
        <UPageGrid>
          <UPageCard
            v-for="reason in reasons.cards"
            :key="reason.title"
            :title="reason.title"
            :description="reason.description"
            :icon="reason.icon"
            :spotlight="true"
            variant="soft"
          />
        </UPageGrid>
      </UContainer>
    </UPageSection>

    <!-- Stats Section -->
    <UPageSection id="stats" :title="stats.title" :description="stats.description">
      <UContainer>
        <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            v-for="stat in stats.cards"
            :key="stat.title"
            :label="stat.label"
            :value="stat.value"
            :icon="stat.icon"
            variant="subtle"
          />
        </UPageGrid>
      </UContainer>
    </UPageSection>

    <!-- Deep Dive Tabs -->
    <UPageSection id="features" :title="features.title" :description="features.description">
      <UContainer>
        <UTabs :items="features.tabs" class="w-full">
          <template #content="{ item }">
            <UPageCard
              :title="item.title"
              :description="item.description"
              :icon="item.icon"
              :reverse="item.reverse"
              variant="subtle"
              orientation="horizontal"
              >
              <NuxtImg
                :src="item.image"
                :alt="item.title"
                class="rounded-lg shadow-lg"
                width="600" height="300"
              />
              <template #footer>
                <Points :points="item.points" />
              </template>
            </UPageCard>
          </template>
        </UTabs>
        <div class="hidden">
          <NuxtImg v-for="tab in features.tabs" :key="tab.image" :src="tab.image" width="600" height="300" />
        </div>
      </UContainer>
    </UPageSection>

    <!-- How It Works Steps -->
    <UPageSection id="steps" :title="steps.title" :description="steps.description">
      <UContainer>
        <UStepper :items="steps.items" size="lg">
          <template #content="{ item }">
            <UCard variant="soft" class="max-w-2xl mx-auto mt-2 lg:mt-8 border-1 border-violet-200 dark:border-violet-950">
              <p class="my-2 text-gray-600 dark:text-gray-300">
                {{ item.leading }}
              </p>
              <USeparator class="my-2" />
              <Points :points="item.points" />
            </UCard>
          </template>
        </UStepper>
      </UContainer>
    </UPageSection>

    <!-- Testimonials Section -->
    <UPageSection
      id="testimonials"
      :headline="testimonials.headline"
      :title="testimonials.title"
      :description="testimonials.description"
    >
      <UPageMarquee pause-on-hover :ui="{ root: '--duration:40s' }">
        <UPageCard
          v-for="(testimonial, index) in testimonials.items"
          :key="index"
          :description="testimonial.quote"
          :ui="{ description: 'before:content-[open-quote] after:content-[close-quote]' }"
          variant="subtle"
          class="max-w-md"
        >
          <template #footer>
            <UUser v-bind="testimonial.user" size="lg" />
          </template>
        </UPageCard>
      </UPageMarquee>
    </UPageSection>

    <!-- FAQ Section -->
    <UPageSection id="faqs" :title="faqs.title" :description="faqs.description">
      <UTabs :items="faqs.categories" orientation="horizontal">
        <template #content="{ item: category }">
          <UPageAccordion :items="category.questions" class="max-w-2xl mx-auto">
            <template #body="{ item: question }">
              <MDCSlot :value="question.content" class="px-4" />
            </template>
          </UPageAccordion>
        </template>
      </UTabs>
    </UPageSection>

    <!-- CTA Section -->
    <UPageSection>
      <UPageCTA
        class="rounded-none sm:rounded-xl bg-gradient-violet border-1 border-violet-200 dark:border-violet-950"
        :title="cta.title"
        :description="cta.description"
        :links="cta.links"
      />
    </UPageSection>

  </div>
</template>
