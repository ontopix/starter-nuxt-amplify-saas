import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const schemaLandingData = z.object({})
const schemaAboutData = z.object({})
const schemaNavigationData = z.object({})

export default defineContentConfig({
  collections: {
    // navigation data
    navigation_en: defineCollection({
      type: 'data',
      source: 'data/navigation_en.yaml',
      schema: schemaNavigationData,
    }),
    navigation_es: defineCollection({
      type: 'data',
      source: 'data/navigation_es.yaml',
      schema: schemaNavigationData,
    }),
    // landing data
    landing_en: defineCollection({
      type: 'data',
      source: 'data/landing_en.yaml',
      schema: schemaLandingData,
    }),
    landing_es: defineCollection({
      type: 'data',
      source: 'data/landing_es.yaml',
      schema: schemaLandingData,
    }),
    // about data
    about_en: defineCollection({
      type: 'data',
      source: 'data/about_en.yaml',
      schema: schemaAboutData,
    }),
    about_es: defineCollection({
      type: 'data',
      source: 'data/about_es.yaml',
      schema: schemaAboutData,
    }),
    // blog posts
    blog_en: defineCollection({
      type: 'page',
      source: {
        include: 'blog/en/**',
        prefix: '/blog/',
      },
    }),
    blog_es: defineCollection({
      type: 'page',
      source: {
        include: 'blog/es/**',
        prefix: '/es/blog',
      },
    }),
    // solutions
    solutions_en: defineCollection({
      type: 'page',
      source: {
        include: 'solutions/en/**',
        prefix: '/solutions/',
      },
    }),
    solutions_es: defineCollection({
      type: 'page',
      source: {
        include: 'solutions/es/**',
        prefix: '/es/solutions',
      },
    }),
    // cases
    cases_en: defineCollection({
      type: 'page',
      source: {
        include: 'cases/en/**',
        prefix: '/cases/',
      },
    }),
    cases_es: defineCollection({
      type: 'page',
      source: {
        include: 'cases/es/**',
        prefix: '/es/cases',
      },
    })
  }
})
