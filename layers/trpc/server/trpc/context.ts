import type { inferAsyncReturnType } from '@trpc/server'
import type { CreateNuxtContextOptions } from 'trpc-nuxt'

/**
 * Creates context for an incoming tRPC request
 *
 * This context will be available in all procedures and can contain:
 * - User authentication information
 * - Database connections
 * - Request/response objects
 * - Any other data needed across procedures
 *
 * @link https://trpc.io/docs/context
 */
export const createContext = async (opts: CreateNuxtContextOptions) => {
  const { event } = opts

  // TODO: Integrate with Amplify authentication
  // Example of how to integrate with the existing Amplify auth:
  /*
  import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

  const authContext = await withAmplifyAuth(event, async (contextSpec) => {
    const session = await fetchAuthSession(contextSpec)
    const user = session.tokens ? await getCurrentUser(contextSpec) : null
    return { user, session, contextSpec }
  }).catch(() => null)
  */

  return {
    // H3 event object - contains request/response and headers
    event,

    // Placeholder for user authentication - implement with Amplify
    user: null,
    session: null,

    // Add any other context data needed across procedures
    // Example: database connection, external service clients, etc.
  }
}

export type Context = inferAsyncReturnType<typeof createContext>