import { createNuxtApiHandler } from 'trpc-nuxt'
import { appRouter } from '../../trpc/routers'
import { createContext } from '../../trpc/context'

/**
 * tRPC API handler for Nuxt
 *
 * This creates the main API endpoint at /api/trpc that handles all tRPC requests.
 * The [trpc] dynamic route captures all tRPC procedure calls and routes them
 * to the appropriate router and procedure.
 *
 * @see https://trpc.io/docs/server/adapters/nuxt
 */
export default createNuxtApiHandler({
  router: appRouter,
  createContext,
  onError: ({ error, path, input, ctx, type, req }) => {
    // Log errors for debugging
    console.error(`❌ tRPC Error on \`${path}\`:`, error)

    // You can also send errors to external monitoring services here
    // Example: Sentry, DataDog, etc.
  },
})