// Billing-related TypeScript types and interfaces

export interface Subscription {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  stripeProductId?: string
  status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'paused' | 'trialing' | 'unpaid'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  canceledAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface Invoice {
  invoiceId: string
  userId: string
  stripeInvoiceId: string
  stripeCustomerId: string
  amount: number
  currency: string
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  created: string
  dueDate?: string
  paidAt?: string
  hostedInvoiceUrl?: string
  invoicePdf?: string
}