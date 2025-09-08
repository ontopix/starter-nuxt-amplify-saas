# I18n Layer

Esta layer proporciona la configuración base de internacionalización para todo el proyecto.

## Características

- **Configuración común**: Formatos de números, fechas y estrategia de localización
- **Traducciones base**: Términos comunes utilizados en toda la aplicación
- **Auto-merge**: Cada layer puede agregar sus propias traducciones automáticamente

## Uso

### En otras layers

Cada layer puede definir sus propias traducciones agregando configuración i18n en su `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  i18n: {
    locales: [
      { code: 'en', file: 'layer-name.json' },
      { code: 'es', file: 'layer-name.json' }
    ]
  }
})
```

### Estructura de archivos

```
layers/layer-name/
├── locales/
│   ├── en/
│   │   └── layer-name.json
│   └── es/
│       └── layer-name.json
└── nuxt.config.ts
```

## Formatos disponibles

- **Currency**: `$n(value, 'currency')` 
- **Decimal**: `$n(value, 'decimal')`
- **Percent**: `$n(value, 'percent')`
- **Short date**: `$d(date, 'short')`
- **Long date**: `$d(date, 'long')`

## Traducciones comunes

- `$t('common.save')`, `$t('common.cancel')`, etc.
- `$t('navigation.dashboard')`, `$t('navigation.settings')`, etc.
- `$t('status.active')`, `$t('status.pending')`, etc.