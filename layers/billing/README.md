# Billing Layer

Comprehensive Stripe billing integration layer for Nuxt 3 applications. This layer provides complete subscription management, payment processing, billing plans, and usage tracking functionality.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Composables](#composables)
- [API Endpoints](#api-endpoints)
- [Types & Utils](#types--utils)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The Billing layer integrates Stripe with Nuxt 3, providing:

- 💳 **Stripe Integration** - Complete payment processing
- 🎫 **Customer Portal** - Stripe-managed subscription management (primary interface)
- 📋 **Subscription Tracking** - Read subscription status and plan details
- 📊 **Usage Tracking** - Monitor usage metrics and limits
- 🔒 **Secure Webhooks** - Real-time subscription updates
- 📱 **Type Safety** - Full TypeScript support throughout
- 🎨 **Pre-built Components** - Ready-to-use billing UI (see apps/saas)

> **Portal-First Approach**: This layer prioritizes Stripe's Customer Portal for all subscription management operations (cancellations, plan changes, payment method updates). This ensures consistency, reliability, and compliance while reducing maintenance overhead.

## Architecture

```
layers/billing/
├── composables/          # Reactive billing state management
│   ├── useBilling.ts     # Main billing composable
│   └── useStripe.ts      # Stripe checkout integration
├── server/
│   ├── api/billing/      # Billing API endpoints
│   │   ├── checkout.post.ts    # Create checkout sessions
│   │   ├── portal.post.ts      # Customer portal access
│   │   ├── webhook.post.ts     # Stripe webhooks
│   │   ├── subscription.get.ts # Get subscription data
│   │   ├── cancel.post.ts      # Cancel subscription
│   │   └── resume.post.ts      # Resume subscription
│   └── utils/
│       └── database.ts   # Database operations
├── types/
│   └── index.ts          # TypeScript definitions
├── utils/
│   ├── index.ts          # General utilities
│   └── billing.ts        # Billing-specific utilities
└── nuxt.config.ts        # Layer configuration
```

## Composables

### `useBilling()`

The primary composable for managing subscriptions and billing operations.

#### Reactive State

```typescript
interface BillingState {
  subscription: UserSubscription | null     // Current subscription
  customer: StripeCustomer | null          // Stripe customer info
  currentPlan: SubscriptionPlan | null     // Current plan details
  availablePlans: SubscriptionPlan[]       // All available plans
  isActive: boolean                        // Is subscription active
  isLoading: boolean                       // Loading state
  error: string | null                     // Error messages
}
```

#### Key Methods

- `fetchSubscription()` - Load current subscription
- `createCheckoutSession(planId)` - Create Stripe checkout
- `createPortalSession(returnUrl?)` - Open customer portal (handles all subscription management)
- `fetchUsage(period?)` - Get usage metrics

#### Basic Usage

```vue
<script setup>
const { 
  subscription,
  currentPlan,
  availablePlans,
  isActive,
  isLoading,
  createCheckoutSession,
  createPortalSession,
  fetchSubscription 
} = useBilling()

// Load subscription on mount
onMounted(() => {
  fetchSubscription()
})

// Upgrade to Pro plan
const upgradeToPro = async () => {
  const result = await createCheckoutSession('pro')
  if (result.success) {
    window.location.href = result.data.url
  }
}

// Open customer portal for all subscription management
const openPortal = async () => {
  const result = await createPortalSession('/settings/billing')
  if (result.success) {
    window.open(result.data.url, '_blank')
  }
}
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  
  <div v-else-if="isActive" class="subscription-active">
    <h3>{{ currentPlan?.name }} Plan</h3>
    <p>Status: {{ subscription?.status }}</p>
    <button @click="openPortal">Manage Subscription</button>
  </div>
  
  <div v-else class="no-subscription">
    <h3>Choose a Plan</h3>
    <div v-for="plan in availablePlans" :key="plan.id">
      <h4>{{ plan.name }}</h4>
      <p>${{ plan.price }}/{{ plan.interval }}</p>
      <button @click="createCheckoutSession(plan.id)">
        Subscribe
      </button>
    </div>
  </div>
</template>
```

### `useStripe()`

Direct Stripe integration for custom checkout flows.

```typescript
const { 
  createAndRedirectToCheckout,  // Direct checkout redirect
  isLoading,
  error 
} = useStripe()

// Direct checkout
const handleCheckout = async () => {
  await createAndRedirectToCheckout('price_123', {
    successUrl: '/success',
    cancelUrl: '/pricing'
  })
}
```

## API Endpoints

### `POST /api/billing/checkout`

Create Stripe checkout session for subscription.

**Body:**
```typescript
{
  priceId: string           // Stripe price ID
  successUrl?: string       // Success redirect URL
  cancelUrl?: string        // Cancel redirect URL
  metadata?: object         // Additional metadata
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    url: string            // Checkout session URL
    sessionId: string      // Session ID
  }
  error?: string
}
```

### `POST /api/billing/portal`

Create customer portal session for subscription management.

**Body:**
```typescript
{
  returnUrl?: string        // Return URL after portal
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    url: string            // Portal session URL
  }
  error?: string
}
```

### `GET /api/billing/subscription`

Get current user's subscription details.

**Response:**
```typescript
{
  subscription: UserSubscription | null
  customer: StripeCustomer | null
  usage?: BillingUsage
}
```


### `POST /api/billing/webhook`

Stripe webhook endpoint for real-time updates.

**Handles:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Types & Utils

### Core Types

```typescript
interface SubscriptionPlan {
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

interface UserSubscription {
  id: string
  status: Stripe.Subscription.Status
  planId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId: string
  stripeCustomerId: string
}

interface BillingUsage {
  userId: string
  period: string
  projects?: number
  users?: number
  storageBytes?: number
  apiRequests?: number
}
```

### Utility Functions

```typescript
// Plan management
getAllPlans(): SubscriptionPlan[]
getPlanById(id: string): SubscriptionPlan | null
getFreePlan(): SubscriptionPlan
comparePlans(planA: string, planB: string): number

// Subscription utilities
isSubscriptionActive(subscription: UserSubscription): boolean
getSubscriptionStatus(subscription: UserSubscription): string
canAccessFeature(plan: SubscriptionPlan, feature: string): boolean

// Error handling
handleBillingError(error: any): string
```

## Usage Examples

### Complete Subscription Flow

```vue
<!-- pages/pricing.vue -->
<script setup>
const { availablePlans, createCheckoutSession, isLoading } = useBilling()

// Load plans from app config
const { billingPlans } = useAppConfig()

const selectPlan = async (planId: string) => {
  const result = await createCheckoutSession(planId)
  
  if (result.success) {
    // Redirect to Stripe Checkout
    window.location.href = result.data.url
  } else {
    console.error('Checkout failed:', result.error)
  }
}
</script>

<template>
  <div class="pricing-page">
    <h1>Choose Your Plan</h1>
    
    <div class="plans-grid">
      <div 
        v-for="plan in billingPlans" 
        :key="plan.id"
        class="plan-card"
      >
        <h3>{{ plan.name }}</h3>
        <div class="price">
          ${{ plan.price }}<span>/{{ plan.interval }}</span>
        </div>
        
        <ul class="features">
          <li v-for="feature in plan.features" :key="feature">
            {{ feature }}
          </li>
        </ul>
        
        <button 
          @click="selectPlan(plan.id)"
          :disabled="isLoading"
          class="btn-primary"
        >
          {{ isLoading ? 'Processing...' : 'Get Started' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

### Subscription Management Dashboard

```vue
<!-- pages/settings/billing.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})

const { 
  subscription, 
  currentPlan, 
  isActive,
  createPortalSession,
  fetchSubscription,
  isLoading 
} = useBilling()

onMounted(() => {
  fetchSubscription()
})

const openPortal = async () => {
  const result = await createPortalSession()
  if (result.success) {
    // Open in same window for better UX
    window.location.href = result.data.url
  }
}
</script>

<template>
  <div class="billing-dashboard">
    <div v-if="isLoading" class="loading">
      Loading subscription...
    </div>
    
    <div v-else-if="isActive" class="active-subscription">
      <div class="subscription-info">
        <h2>{{ currentPlan?.name }} Plan</h2>
        <p class="status">Status: {{ subscription?.status }}</p>
        <p class="period">
          Current period: 
          {{ subscription?.currentPeriodStart?.toLocaleDateString() }} - 
          {{ subscription?.currentPeriodEnd?.toLocaleDateString() }}
        </p>
        
        <div v-if="subscription?.cancelAtPeriodEnd" class="cancel-notice">
          ⚠️ Your subscription will cancel at the end of the current period
        </div>
      </div>
      
      <div class="billing-actions">
        <button @click="openPortal" class="btn-primary">
          Manage Subscription
        </button>
        <p class="portal-info">
          Use the Stripe portal to update payment methods, change plans, cancel, or resume your subscription.
        </p>
      </div>
    </div>
    
    <div v-else class="no-subscription">
      <h2>No Active Subscription</h2>
      <p>You don't have an active subscription.</p>
      <NuxtLink to="/pricing" class="btn-primary">
        View Plans
      </NuxtLink>
    </div>
  </div>
</template>
```

### Usage Monitoring

```vue
<script setup>
const { fetchUsage } = useBilling()

const usage = ref(null)
const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

onMounted(async () => {
  const result = await fetchUsage(currentMonth)
  if (result.success) {
    usage.value = result.data
  }
})
</script>

<template>
  <div class="usage-dashboard">
    <h3>Current Usage</h3>
    
    <div v-if="usage" class="usage-stats">
      <div class="stat">
        <label>Projects</label>
        <span>{{ usage.projects || 0 }}</span>
      </div>
      
      <div class="stat">
        <label>API Requests</label>
        <span>{{ usage.apiRequests || 0 }}</span>
      </div>
      
      <div class="stat">
        <label>Storage</label>
        <span>{{ (usage.storageBytes || 0) / 1024 / 1024 }}MB</span>
      </div>
    </div>
  </div>
</template>
```

### Server-Side Integration

```typescript
// server/api/admin/subscriptions.get.ts
import { getAllSubscriptions } from '~/layers/billing/server/utils/database'

export default defineEventHandler(async (event) => {
  // Admin only endpoint
  const user = await requireAuth(event)
  if (!user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  const subscriptions = await getAllSubscriptions()
  
  return {
    subscriptions,
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length
  }
})
```

## API Reference

### `useBilling()` Return Values

#### State Properties
- `subscription: ComputedRef<UserSubscription | null>` - Current subscription
- `customer: ComputedRef<StripeCustomer | null>` - Customer info
- `currentPlan: ComputedRef<SubscriptionPlan | null>` - Current plan details
- `availablePlans: ComputedRef<SubscriptionPlan[]>` - All plans
- `isActive: ComputedRef<boolean>` - Is subscription active
- `isLoading: ComputedRef<boolean>` - Loading state
- `error: ComputedRef<string | null>` - Error messages

#### Methods
- `fetchSubscription(): Promise<BillingResponse>` - Load current subscription
- `createCheckoutSession(planId: string): Promise<BillingResponse>` - Create checkout
- `createPortalSession(returnUrl?: string): Promise<BillingResponse>` - Open portal (handles all subscription management)
- `fetchUsage(period?: string): Promise<BillingResponse>` - Get usage data

### Error Handling

All methods return standardized responses:

```typescript
interface BillingResponse {
  success: boolean
  data?: any
  error?: string
}
```

Common error scenarios are handled gracefully with user-friendly messages.

This comprehensive billing layer provides everything needed for complete subscription management with Stripe integration.