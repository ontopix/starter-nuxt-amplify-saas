# tRPC Layer

Esta layer proporciona una API type-safe usando tRPC para el proyecto Nuxt + Amplify SaaS. tRPC permite crear APIs totalmente type-safe desde el servidor hasta el cliente, con validación automática y excelente experiencia de desarrollo.

## 🚀 Características

- **Type Safety End-to-End**: Tipos compartidos entre cliente y servidor
- **Validación Automática**: Usando Zod para validar inputs/outputs
- **Integración con Nuxt**: Composables nativos (`useAsyncData`, `useLazyAsyncData`)
- **Request Batching**: Optimización automática de requests
- **Error Handling**: Manejo de errores estructurado
- **Developer Experience**: Autocompletado e IntelliSense completo

## 📦 Instalación

Las dependencias ya están incluidas en el `package.json` de la layer:

```json
{
  "@trpc/client": "^10.45.2",
  "@trpc/server": "^10.45.2",
  "trpc-nuxt": "^0.10.22",
  "zod": "^3.24.2"
}
```

## 🏗️ Arquitectura

```
layers/trpc/
├── server/
│   ├── trpc/
│   │   ├── context.ts              # Context creation
│   │   ├── trpc.ts                 # tRPC instance & procedures
│   │   └── routers/
│   │       └── index.ts            # Main app router
│   └── api/trpc/[trpc].ts          # Nuxt API handler
├── plugins/client.ts               # tRPC client plugin
├── types/index.ts                  # Type exports
└── README.md                       # Esta documentación
```

## 🔧 Uso Básico

### En el Cliente (Vue Components)

```vue
<script setup>
// Queries (GET-like operations)
const { data: greeting } = await $trpc.example.hello.useQuery({
  text: 'World'
})

// Lazy queries
const {
  data: user,
  pending,
  error,
  refresh
} = await $trpc.example.me.useLazyQuery()

// Mutations (POST/PUT/DELETE-like operations)
const updateMutation = $trpc.example.updateExample.useMutation()

const handleUpdate = async () => {
  try {
    const result = await updateMutation.mutate({
      name: 'John Doe',
      email: 'john@example.com'
    })
    console.log('Updated:', result)
  } catch (error) {
    console.error('Update failed:', error)
  }
}
</script>

<template>
  <div>
    <h1>{{ data?.greeting }}</h1>
    <UButton
      @click="handleUpdate"
      :loading="updateMutation.status.value === 'pending'"
    >
      Update Profile
    </UButton>
  </div>
</template>
```

### Composables Avanzados

```typescript
// composables/useUserProfile.ts
export const useUserProfile = () => {
  // Reactive query que se actualiza automáticamente
  const { data: profile, ...query } = $trpc.user.profile.useQuery()

  // Mutation con optimistic updates
  const updateProfile = $trpc.user.updateProfile.useMutation({
    onSuccess: (data) => {
      // Invalidar y refrescar queries relacionadas
      $trpc.user.profile.invalidate()
    }
  })

  return {
    profile,
    updateProfile,
    isLoading: query.pending,
    error: query.error,
    refresh: query.refresh
  }
}
```

## 📡 Crear Routers

### Estructura de un Router

```typescript
// server/trpc/routers/billing.ts
import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'

// Schemas de validación
const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  monthlyPrice: z.number(),
  yearlyPrice: z.number(),
  currency: z.string(),
  features: z.array(z.string())
})

const CheckoutInputSchema = z.object({
  priceId: z.string(),
  planId: z.string(),
  billingInterval: z.enum(['month', 'year'])
})

export const billingRouter = router({
  // Procedure público - obtener planes
  plans: publicProcedure
    .output(z.object({
      success: z.boolean(),
      data: z.object({
        plans: z.array(PlanSchema),
        count: z.number()
      })
    }))
    .query(async ({ ctx }) => {
      // TODO: Integrar con Amplify
      /*
      return await withAmplifyPublic(async (contextSpec) => {
        const client = generateClient<Schema>({ authMode: 'apiKey' })
        const { data: plans } = await client.models.SubscriptionPlan.list(contextSpec)

        return {
          success: true,
          data: {
            plans: plans.map(plan => ({
              id: plan.planId,
              name: plan.name,
              // ... transform data
            })),
            count: plans.length
          }
        }
      })
      */

      // Mock data por ahora
      return {
        success: true,
        data: {
          plans: [],
          count: 0
        }
      }
    }),

  // Procedure protegido - crear checkout
  createCheckout: protectedProcedure
    .input(CheckoutInputSchema)
    .output(z.object({
      success: z.boolean(),
      data: z.object({
        url: z.string(),
        sessionId: z.string()
      })
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Integrar con Amplify y Stripe
      /*
      return await withAmplifyAuth(ctx.event, async (contextSpec) => {
        // Crear checkout session con Stripe
        // Guardar en Amplify si es necesario
        return { success: true, data: { url: '...', sessionId: '...' } }
      })
      */

      throw new Error('Not implemented yet')
    }),

  // Procedure protegido - obtener suscripción del usuario
  subscription: protectedProcedure
    .output(z.object({
      success: z.boolean(),
      data: z.object({
        planId: z.string(),
        status: z.string(),
        currentPeriodEnd: z.date()
      }).nullable()
    }))
    .query(async ({ ctx }) => {
      // TODO: Obtener suscripción del usuario desde Amplify
      return {
        success: true,
        data: null
      }
    })
})
```

### Registrar el Router

```typescript
// server/trpc/routers/index.ts
import { billingRouter } from './billing'

export const appRouter = router({
  example: exampleRouter, // Remove when you have real routers
  billing: billingRouter,
  // auth: authRouter,
  // user: userRouter,
})
```

## 🔒 Integración con Amplify

### Context con Amplify Auth

```typescript
// server/trpc/context.ts
import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth/server'

export const createContext = async (opts: CreateNuxtContextOptions) => {
  const { event } = opts

  // Intentar obtener usuario autenticado
  const authContext = await withAmplifyAuth(event, async (contextSpec) => {
    const session = await fetchAuthSession(contextSpec)
    const user = session.tokens ? await getCurrentUser(contextSpec) : null

    return {
      user,
      session,
      contextSpec,
      isAuthenticated: !!session.tokens
    }
  }).catch(() => ({
    user: null,
    session: null,
    contextSpec: null,
    isAuthenticated: false
  }))

  return {
    event,
    ...authContext
  }
}
```

### Procedures con Amplify

```typescript
// server/trpc/trpc.ts
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // TypeScript sabe que user existe aquí
      session: ctx.session,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)
```

### Usando Amplify en Procedures

```typescript
// En cualquier procedure
.query(async ({ ctx }) => {
  // Para procedures públicos
  return await withAmplifyPublic(async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'apiKey' })
    // ... operaciones públicas
  })
})

.mutation(async ({ ctx, input }) => {
  // Para procedures protegidos
  return await withAmplifyAuth(ctx.event, async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'userPool' })
    // ... operaciones autenticadas
  })
})
```

## 🎯 Patrones Recomendados

### 1. Organización de Routers

```
server/trpc/routers/
├── index.ts           # Router principal
├── billing.ts         # Todo lo relacionado con facturación
├── auth.ts            # Autenticación y autorización
├── user.ts            # Gestión de usuarios
├── admin.ts           # Funciones de administración
└── shared/            # Schemas y utilidades compartidas
    ├── schemas.ts     # Esquemas Zod compartidos
    └── utils.ts       # Funciones de utilidad
```

### 2. Naming Conventions

```typescript
// Procedures: verbo + sustantivo
router({
  // Queries (lecturas)
  getPlans: publicProcedure...,
  getUserSubscription: protectedProcedure...,

  // Mutations (escrituras)
  createCheckout: protectedProcedure...,
  updateProfile: protectedProcedure...,
  deleteAccount: protectedProcedure...,
})
```

### 3. Schemas Compartidos

```typescript
// server/trpc/routers/shared/schemas.ts
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
})

export const PaginationInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

export const PaginationOutputSchema = z.object({
  total: z.number(),
  pages: z.number(),
  page: z.number(),
  limit: z.number(),
})
```

### 4. Error Handling

```typescript
import { TRPCError } from '@trpc/server'

// En procedures
.mutation(async ({ input, ctx }) => {
  try {
    // Operación
    return result
  } catch (error) {
    // Log del error
    console.error('Operation failed:', error)

    // Error específico para el cliente
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to complete operation',
      cause: error
    })
  }
})
```

## 🧪 Testing

### Testing de Procedures

```typescript
// tests/trpc/billing.test.ts
import { createContext } from '../server/trpc/context'
import { appRouter } from '../server/trpc/routers'

describe('Billing Router', () => {
  it('should get plans without auth', async () => {
    const ctx = await createContext({
      event: mockH3Event()
    })

    const caller = appRouter.createCaller(ctx)
    const result = await caller.billing.plans()

    expect(result.success).toBe(true)
    expect(result.data.plans).toBeInstanceOf(Array)
  })

  it('should require auth for checkout', async () => {
    const ctx = await createContext({
      event: mockH3Event() // Sin autenticación
    })

    const caller = appRouter.createCaller(ctx)

    await expect(
      caller.billing.createCheckout({
        priceId: 'price_123',
        planId: 'pro',
        billingInterval: 'month'
      })
    ).rejects.toThrow('UNAUTHORIZED')
  })
})
```

## 🔄 Migración desde REST

### Paso 1: Crear Router tRPC

```typescript
// Mantén el endpoint REST existente
// server/api/billing/plans.get.ts (sin cambios)

// Crea el procedure tRPC
// server/trpc/routers/billing.ts
export const billingRouter = router({
  plans: publicProcedure
    .output(/* same schema as REST */)
    .query(async () => {
      // Reutiliza la lógica del endpoint REST
      // O llama directamente al endpoint existente
    })
})
```

### Paso 2: Migrar Frontend Gradualmente

```vue
<script setup>
// Antes (REST)
// const { data } = await $fetch('/api/billing/plans')

// Después (tRPC)
const { data } = await $trpc.billing.plans.useQuery()
</script>
```

### Paso 3: Deprecar REST Endpoints

Una vez migrado completamente el frontend, puedes remover los endpoints REST.

## 🚨 Troubleshooting

### Error: "Cannot find module '@trpc/...'"

```bash
# Instalar dependencias
pnpm install
```

### Error: "Type instantiation is excessively deep"

Esto puede ocurrir con routers muy grandes. Solución:

```typescript
// Dividir routers grandes en sub-routers
const userManagementRouter = router({ ... })
const userPreferencesRouter = router({ ... })

const userRouter = router({
  management: userManagementRouter,
  preferences: userPreferencesRouter,
})
```

### Error de CORS o Headers

```typescript
// plugins/client.ts
const client = createTRPCNuxtClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers() {
        return {
          // Headers necesarios
        }
      },
    }),
  ],
})
```

### Problemas de Types en el Cliente

```typescript
// Reinicia el servidor de desarrollo
// Verifica que el AppRouter se esté exportando correctamente
// types/index.ts
export type { AppRouter } from '../server/trpc/routers'
```

## 📚 Recursos Adicionales

- [tRPC Documentation](https://trpc.io/docs)
- [tRPC Nuxt Integration](https://trpc-nuxt.vercel.app/)
- [Zod Documentation](https://zod.dev/)
- [tRPC Error Codes](https://trpc.io/docs/server/error-handling)

## 🤝 Contribuciones

Al añadir nuevos procedures:

1. **Siempre usa Zod** para validación de input/output
2. **Documenta procedures complejos** con JSDoc
3. **Añade tests** para procedures críticos
4. **Sigue naming conventions** establecidas
5. **Maneja errores** apropiadamente
6. **Considera el impacto** en el frontend al hacer cambios