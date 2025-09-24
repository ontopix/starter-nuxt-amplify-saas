<script setup>
const { locale } = useI18n()
const { data: content } = await useAsyncData('about-content-' + locale.value, () => {
  return queryCollection('about_' + locale.value).first();
}, {
  watch: [locale],
})

const hero = content.value?.meta.hero || []
const mission = content.value?.meta.mission || []
const team = content.value?.meta.team || []
const impact = content.value?.meta.impact || []
const cta = content.value?.meta.cta || []


// SEO Meta
const seo = content.value?.meta.seo || {}
if (seo) {
  useSeoMeta(seo)
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <UPageSection id="hero">
      <UContainer class="text-center max-w-4xl mx-auto">
        <h1 class="text-4xl md:text-6xl font-bold mb-6">
          {{ hero.titleAbout }}
          <span class="text-gradient-violet lg:text-nowrap">
            {{ hero.titleOntopix }}
          </span>
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          {{ hero.description }}
        </p>
      </UContainer>
    </UPageSection>

    <!-- Mission Section -->
    <UPageSection id="mission">
      <UContainer>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {{ mission.title }}
            </h2>
            <p class="text-lg text-gray-600 dark:text-gray-300 mb-6">
              {{ mission.description }}
            </p>

            <div class="grid grid-cols-2 gap-4">
              <UPageCard
                v-for="principle in mission.principles"
                :key="principle.key"
                :title="principle.value"
                :description="principle.description"
                :icon="principle.icon"
                :spotlight="true"
                variant="soft"
              />
            </div>
          </div>

          <div class="relative">
            <NuxtImg
              src="/images/about/mission.png"
              alt="Ontopix team working together"
              class="rounded-2xl shadow-lg"
              width="500" height="500" placeholder
            />
          </div>
        </div>
      </UContainer>
    </UPageSection>

    <!-- Team Section -->
    <UPageSection id="team" :title="team.title" :description="team.description">
      <UContainer>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <UCard v-for="member in team.members" :key="member.name" variant="soft">
            <template #header>
              <div class="flex justify-center">
                <NuxtImg
                  :src="member.avatar.src"
                  :alt="member.name"
                  class="w-24 h-24 rounded-full object-cover"
                  width="96" height="96" placeholder
                />
              </div>
            </template>

            <div class="p-2">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ member.name }}
              </h3>
              <p class="text-gradient-violet font-medium mb-4">
                {{ member.description }}
              </p>
              <p class="text-gray-600 dark:text-gray-300 text-sm mb-6">
                {{ member.bio }}
              </p>

              <div class="flex justify-center space-x-3">
                <UButton
                  v-if="member.links.linkedin"
                  :to="member.links.linkedin"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  target="_blank"
                  external
                >
                  <UIcon name="simple-icons:linkedin" />
                </UButton>
                <UButton
                  v-if="member.links.twitter"
                  :to="member.links.twitter"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  target="_blank"
                  external
                >
                  <UIcon name="simple-icons:x" />
                </UButton>
                <UButton
                  v-if="member.links.github"
                  :to="member.links.github"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  target="_blank"
                  external
                >
                  <UIcon name="simple-icons:github" />
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </UContainer>
    </UPageSection>

    <!-- Stats Section -->
    <UPageSection id="stats" :title="impact.title" :description="impact.description">
      <UContainer>
        <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            v-for="stat in impact.cards"
            :key="stat.title"
            :label="stat.label"
            :value="stat.value"
            :icon="stat.icon"
            variant="subtle"
          />
        </UPageGrid>
      </UContainer>
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
