import type { H3Event, EventHandlerRequest } from 'h3'
import { useUserServer } from '../../composables/useUser'

/**
 * Direct authentication function for server API routes
 * Only validates authentication and throws error if not authenticated
 *
 * @param event - H3Event from the API route
 * @throws createError with 401 if authentication fails
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   await requireAuth(event) // Only authenticate if needed
 *
 *   // Use useUserServer() to get user data after authentication
 *   const { userAttributes } = useUserServer()
 *   // rest of logic...
 * })
 * ```
 */
export const requireAuth = async (event: H3Event<EventHandlerRequest>) => {
  const { fetchUser, isAuthenticated } = useUserServer()

  await fetchUser(event)

  if (!isAuthenticated.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
}

/**
 * Higher-order function that wraps an event handler with authentication
 *
 * @param handler - The event handler function to wrap
 * @returns A new event handler that requires authentication
 *
 * @example
 * ```typescript
 * export default withAuth(async (event) => {
 *   const user = event.context.user // Already authenticated
 *
 *   // Your endpoint logic here...
 *   return { data: 'protected data' }
 * })
 * ```
 */
export const withAuth = <T = any>(
  handler: (event: H3Event<EventHandlerRequest> & { context: { user: any } }) => Promise<T> | T
) => {
  return defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
    // Apply authentication first
    await requireAuth(event)

    // Execute the original handler
    return await handler(event as any)
  })
}