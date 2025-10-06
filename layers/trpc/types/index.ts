/**
 * tRPC type exports
 *
 * Export types from tRPC routers for use throughout the application
 * This allows you to use tRPC types in your components and composables
 */

// Re-export the main AppRouter type
export type { AppRouter } from '../server/trpc/routers'

// Re-export tRPC types that might be useful
export type { TRPCError } from '@trpc/server'

// Utility types for working with tRPC
export type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Example of how to create specific input/output types
// Uncomment when you have actual routers
/*
import type { AppRouter } from '../server/trpc/routers'

// Create input and output type helpers
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

// Example: Get specific procedure types
export type HelloInput = RouterInputs['example']['hello']
export type HelloOutput = RouterOutputs['example']['hello']
*/