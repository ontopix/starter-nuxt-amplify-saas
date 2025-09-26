import { a } from '@aws-amplify/backend'

// UserProfile model
export const userProfileModel = a.model({
  userId: a.string().required(),
  stripeCustomerId: a.string(),
  stripeProductId: a.string(),
  stripePriceId: a.string(),
})
  .identifier(['userId'])
  .authorization((allow: any) => [
    allow.publicApiKey(),
    allow.ownerDefinedIn("userId").to(["read"]),
  ])