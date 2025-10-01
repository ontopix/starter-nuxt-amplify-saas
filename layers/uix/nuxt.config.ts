// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  css: ["@starter-nuxt-amplify-saas/uix/assets/css/main.css"],

  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  }
})
