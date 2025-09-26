// Auth-related TypeScript types and interfaces

export interface UserProfile {
  userId: string
  stripeCustomerId?: string
  stripeProductId?: string
  stripePriceId?: string
}