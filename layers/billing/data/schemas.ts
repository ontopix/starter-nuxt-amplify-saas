import { a } from '@aws-amplify/backend'

// Subscription model for tracking user subscriptions
export const subscriptionModel = a.model({
  userId: a.string().required(),
  stripeCustomerId: a.string().required(),
  stripeSubscriptionId: a.string(),
  stripePriceId: a.string(),
  stripeProductId: a.string(),
  status: a.enum(['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid']),
  currentPeriodStart: a.datetime(),
  currentPeriodEnd: a.datetime(),
  canceledAt: a.datetime(),
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
  .identifier(['userId'])
  .authorization((allow: any) => [
    allow.publicApiKey(),
    allow.ownerDefinedIn("userId").to(["read"]),
  ])

// Invoice model for tracking billing history
export const invoiceModel = a.model({
  invoiceId: a.string().required(),
  userId: a.string().required(),
  stripeInvoiceId: a.string().required(),
  stripeCustomerId: a.string().required(),
  amount: a.float().required(),
  currency: a.string().required(),
  status: a.enum(['draft', 'open', 'paid', 'uncollectible', 'void']),
  created: a.datetime().required(),
  dueDate: a.datetime(),
  paidAt: a.datetime(),
  hostedInvoiceUrl: a.string(),
  invoicePdf: a.string(),
})
  .identifier(['invoiceId'])
  .authorization((allow: any) => [
    allow.publicApiKey(),
    allow.ownerDefinedIn("userId").to(["read"]),
  ])