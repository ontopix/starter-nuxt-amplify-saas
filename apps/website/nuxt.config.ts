// https://nuxt.com/docs/api/configuration/nuxt-config

const BUILD_TARGET = process.env.BUILD_TARGET || (process.env.NODE_ENV === 'development' ? 'nitro' : 'static')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: [
    '@nuxt/ui-pro',
    '@nuxt/content',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    'nuxt-og-image'
  ],

  app: {
    baseURL: '/',
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon-color.svg' },
        { rel: 'icon', type: 'image/png', href: '/favicon-16.png', sizes: '16x16' },
        { rel: 'icon', type: 'image/png', href: '/favicon-32.png', sizes: '32x32' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48.png', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      ]
    }
  },

  site: {
    url: 'https://ontopix.ai/',
    name: 'Ontopix',
    defaultLocale: 'en',
    description: 'Transform Customer Service with AI Virtual Agents',
    themeColor: '#8800ff',
    language: 'en'
  },

  robots: {
    allow: '*'
  },

  css: [
    '~/assets/css/main.css'
  ],

  vite: {
    server: {
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        'ontopix.ai',
        'www.ontopix.ai',
        'dev.www.ontopix.ai',
        'pre.www.ontopix.ai',
      ]
    }
  },

  content: {
    experimental: {
      sqliteConnector: 'native'
    }
  },

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    // TODO: find a better way to detect the browser language
    detectBrowserLanguage: false,
    // BUG: if enabled this way, a user with a cookie=es, will be redirected
    //      to /es on requesting /, which causes hydratation mismatches on BUILD_TARGET=static
    // detectBrowserLanguage: {
    //   useCookie: true,
    //   cookieKey: 'ontopix_i18n',
    //   redirectOn: 'root'
    // },
    locales: [{
      code: 'en',
      language: 'en-US',
      name: 'English',
      file: 'en.yaml'
    }, {
      code: 'es',
      language: 'es-ES',
      name: 'Español',
      file: 'es.yaml'
    }]
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => [
        'elevenlabs-convai'
      ].includes(tag)
    }
  },

  // image provider depending on the build target
  image: BUILD_TARGET === 'nitro'
    ? { provider: 'ipx' }
    : { provider: 'ipxStatic' },

  // icon, ensuring all used icons are bundled
  icon: {
    customCollections: [],
    serverBundle: {
      collections: [
        'heroicons',
        'simple-icons',
        'lucide'
      ]
    },
    fallbackToApi: false
  },

  nitro: BUILD_TARGET === 'nitro'
    ? {
        preset: 'node-server',
      }
    : {
        preset: 'github-pages',
        static: true,
        prerender: {
          crawlLinks: true,
          routes: [
            '/sitemap.xml',
            '/robots.txt'
          ],
        },
      }

})
