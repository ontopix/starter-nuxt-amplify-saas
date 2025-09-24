<script setup lang="ts">
import * as locales from '@nuxt/ui-pro/locale'
const { locale } = useI18n()
const uiProLocale = computed(() => locales[locale.value] ?? locales.en)
</script>

<template>
  <UApp :locale="uiProLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
