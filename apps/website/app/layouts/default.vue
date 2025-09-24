<script setup>
import { en, es } from '@nuxt/ui-pro/locale'
const { locale, setLocale } = useI18n()
const dataKey = computed(() => `navigation-${locale.value}`)
const { data: links } = await useAsyncData(dataKey, async () => {
  const collection = await queryCollection('navigation_' + locale.value).first();
  const header = await Promise.all(
    collection.meta?.header?.map(async link => {
      if (link.collection) {
        return {
          ...link,
          children: await getCollectionData(link.collection),
        }
      }
      return link;
    })
  );
  return {
    ...collection,
    meta: {
      ...collection.meta || {},
      header
    }
  };
}, {
  watch: [locale],
});

async function getCollectionData(collection) {
  const collectionData = await queryCollection(collection + '_' + locale.value).all();
  return collectionData.map(item => {
    return {
      label: item.title,
      to: item.path,
      icon: item.meta?.icon,
      badge: item.meta?.badge,
      tooltip: item.meta?.tooltip,
      description: item.description,
    }
  });
}
</script>

<template>
  <UPage>
    <!-- Header -->
    <UHeader title="Ontopix">
      <template #left>
        <OntopixLogo
          class="inline-block h-9"
          :to="links.meta.home"
          :gradient="['#8800ff', '#880088']"
          :gradient-dark="['#8800ff', '#880088']"
        />
      </template>

      <UNavigationMenu :items="links.meta.header || []" />

      <template #right>
        <UColorModeButton />
        <ULocaleSelect :model-value="locale" :locales="[es, en]" @update:model-value="setLocale($event)" />
      </template>

      <template #body>
        <UNavigationMenu :items="links.meta.header || []" orientation="vertical" />
      </template>
    </UHeader>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <UFooter class="bg-gray-100 dark:bg-black">
      <template #top>
        <UContainer>
          <UFooterColumns :columns="links.meta.footer">
            <template #left>
              <OntopixLogo
                class="inline-block h-7"
                :to="links.meta.home"
                :gradient="['#666', '#888']"
                :gradient-dark="['#bbb', '#aaa']"
              />
              <USeparator class="my-4" />
              <UFormField name="email" :label="$t('footer.newsletter')">
                <UInput type="email" :placeholder="$t('footer.newsletterPlaceholder')" class="w-80">
                  <template #trailing>
                    <UButton type="submit" size="xs" variant="ghost" :label="$t('footer.newsletterSubscribe')" />
                  </template>
                </UInput>
              </UFormField>
            </template>
            <template #right>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                © {{ new Date().getFullYear() }} Ontopix. {{ $t('footer.rightsReserved') }}
              </div>
            </template>
          </UFooterColumns>
        </UContainer>
      </template>
    </UFooter>
  </UPage>
</template>
