export default defineNuxtConfig({
  runtimeConfig: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    public: {
      stripe: {
        publishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      }
    }
  }
})
