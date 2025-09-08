export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    // Configuración base común para todas las layers
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    lazy: true,
    
    // Formatos comunes para números y fechas
    numberFormats: {
      en: {
        currency: { 
          style: 'currency', 
          currency: 'USD', 
          notation: 'standard' 
        },
        decimal: { 
          style: 'decimal', 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        },
        percent: { 
          style: 'percent', 
          useGrouping: false 
        }
      },
      es: {
        currency: { 
          style: 'currency', 
          currency: 'EUR', 
          notation: 'standard' 
        },
        decimal: { 
          style: 'decimal', 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        },
        percent: { 
          style: 'percent', 
          useGrouping: false 
        }
      }
    },
    
    // Formatos comunes para fechas
    dateTimeFormats: {
      en: {
        short: { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        },
        long: { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          weekday: 'long' 
        }
      },
      es: {
        short: { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        },
        long: { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          weekday: 'long' 
        }
      }
    },
    
    // Solo locales base - cada layer agregará los suyos automáticamente
    locales: [
      { 
        code: 'en', 
        iso: 'en-US', 
        name: 'English', 
        file: 'en/common.json' 
      },
      { 
        code: 'es', 
        iso: 'es-ES', 
        name: 'Español', 
        file: 'es/common.json' 
      }
    ]
  }
})