import type Stripe from 'stripe'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  stripePriceId: string
  features: string[]
  popular?: boolean
  limits: {
    projects?: number
    users?: number
    storage?: string
    apiRequests?: number
  }
}

export interface BillingState {
  subscription: UserSubscription | null
  customer: StripeCustomer | null
  isLoading: boolean
  error: string | null
}

export interface UserSubscription {
  id: string
  userId: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  planId: string
  status: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface StripeCustomer {
  id: string
  userId: string
  stripeCustomerId: string
  email?: string
  name?: string
  createdAt?: Date
}

export interface BillingUsage {
  id: string
  userId: string
  period: string
  projects: number
  users: number
  storageBytes: number
  apiRequests: number
  createdAt?: Date
  updatedAt?: Date
}

export interface CheckoutSession {
  url: string
  sessionId: string
}

export interface BillingPortalSession {
  url: string
}

export interface BillingResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}

// Specific response types
export interface CheckoutResponse extends BillingResponse<CheckoutSession> {}
export interface PortalResponse extends BillingResponse<BillingPortalSession> {}
export interface SubscriptionResponse extends BillingResponse<UserSubscription | null> {}

export interface StripeWebhookEvent {
  type: string
  data: {
    object: any
  }
}

export interface InvoiceItem {
  id: string
  amount: number
  currency: string
  status: string
  created: Date
  hostedInvoiceUrl?: string
  invoicePdf?: string
  description?: string
}

export interface UsageMetrics {
  projects: {
    current: number
    limit: number
  }
  users: {
    current: number
    limit: number
  }
  storage: {
    current: number
    limit: number
    unit: 'GB' | 'MB'
  }
  apiRequests: {
    current: number
    limit: number
    period: 'month'
  }
}