import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '../server/trpc/routers'

/**
 * tRPC Nuxt client plugin
 *
 * This plugin creates a tRPC client that's available throughout your Nuxt app.
 * It provides:
 * - Type-safe API calls
 * - Automatic request batching
 * - Built-in error handling
 * - Integration with Nuxt's composables (useAsyncData, etc.)
 *
 * Usage in components:
 * ```vue
 * <script setup>
 * // Query example
 * const { data } = await $trpc.example.hello.useQuery({ text: 'World' })
 *
 * // Mutation example
 * const updateMutation = $trpc.example.updateExample.useMutation()
 * await updateMutation.mutate({ name: 'John', email: 'john@example.com' })
 * </script>
 * ```
 */
export default defineNuxtPlugin(() => {
  /**
   * createTRPCNuxtClient adds tRPC composables built on top of Nuxt's useAsyncData
   */
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        // Optional: Add headers for authentication
        // headers() {
        //   return {
        //     // Example: Authorization header
        //     // authorization: getAuthToken(),
        //   }
        // },
      }),
    ],
    // Optional: Global error handling
    // transformer: superjson, // If you need to serialize complex types
  })

  return {
    provide: {
      trpc: client,
    },
  }
})