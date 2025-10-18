# Billing Layer

A simplified Stripe billing integration layer for Nuxt 3 applications using a portal-first approach. This layer provides essential subscription management functionality with maximum delegation to Stripe's Customer Portal for complex billing operations.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Composables](#composables)
- [Server API Routes](#server-api-routes)
- [Utils](#utils)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The Billing layer integrates Stripe with Nuxt 3, providing:

- 🎫 **Portal-First Approach** - Stripe Customer Portal handles all subscription management
- 📋 **Basic Subscription Tracking** - Read subscription status and plan details from user profile
- 💳 **Minimal Stripe Integration** - Only essential functionality for billing operations
- 🔒 **Secure Webhooks** - Real-time subscription updates from Stripe
- 📱 **SSR-compatible session management** - Works with both client and server contexts
- 🔄 **Reactive billing state management** - Integration with auth layer user profile
- 🚀 **Server-side billing utilities** - Protected API routes with subscription validation
- 🎯 **TypeScript support throughout** - Full type safety

## Architecture

```
layers/billing/
├── components/           # UI components for pricing display
│   ├── PricingPlan.vue   # Single plan card component
│   ├── PricingPlans.vue  # Multiple plans side-by-side
│   ├── PricingTable.vue  # Feature comparison table
│   ├── CurrentSubscription.vue  # Current subscription details
│   ├── PaymentMethod.vue        # Payment method management
│   └── InvoicesList.vue         # Invoices list with downloads
├── composables/          # Reactive billing state management
│   └── useBilling.ts     # Main billing composable with auth integration
├── server/               # Server-side billing utilities
│   └── api/billing/      # Billing API endpoints
│       ├── plans.get.ts         # Get available plans
│       ├── subscription.get.ts  # Get user subscription data
│       ├── portal.post.ts       # Create Customer Portal session
│       ├── checkout.post.ts     # Create Checkout session
│       └── webhook.post.ts      # Handle Stripe webhooks
├── utils/                # Helper functions
│   └── index.ts          # Billing utilities and plan management
└── nuxt.config.ts        # Layer configuration
```

## Components

The billing layer provides several UI components that wrap Nuxt UI Pro components with automatic data fetching and billing integration.

### Pricing Components

Three pricing display components that automatically fetch plan data from `/api/billing/plans`:

#### `<PricingPlan>`

Display a single subscription plan card with pricing and features.

**Usage (Autonomous Mode):**
```vue
<template>
  <!-- Fetches plans and displays the first one -->
  <PricingPlan />

  <!-- Fetches plans and displays a specific plan -->
  <PricingPlan plan-id="pro" interval="yearly" />
</template>
```

**Usage (Pass-Through Mode):**
```vue
<template>
  <!-- Pass all props directly to UPricingPlan -->
  <PricingPlan
    title="Pro Plan"
    price="$29"
    billing-cycle="/month"
    :features="['Feature 1', 'Feature 2']"
  />
</template>
```

**Props:**
- All props from Nuxt UI's `<UPricingPlan>` (pass-through mode)
- `planId?: string` - Specific plan ID to display (autonomous mode)
- `interval?: 'monthly' | 'yearly'` - Billing interval (default: 'monthly')
- `ctaLabel?: string` - Call-to-action button label
- `selectedPlanId?: string` - Highlight plan as selected
- `controlled?: boolean` - Emit events instead of handling checkout

#### `<PricingPlans>`

Display multiple subscription plans side-by-side for comparison.

**Usage (Autonomous Mode):**
```vue
<template>
  <!-- Fetches and displays all active plans -->
  <PricingPlans />

  <!-- With custom interval and styling -->
  <PricingPlans
    interval="yearly"
    orientation="horizontal"
    compact
  />
</template>
```

**Usage (Pass-Through Mode):**
```vue
<script setup>
const customPlans = [
  { id: 'starter', name: 'Starter', price: 900, interval: 'monthly' },
  { id: 'pro', name: 'Pro', price: 2900, interval: 'monthly' }
]
</script>

<template>
  <!-- Use custom plan data -->
  <PricingPlans :plans="customPlans" />
</template>
```

**Props:**
- All props from Nuxt UI's `<UPricingPlans>` (pass-through mode)
- `plans?: InputPlan[]` - Custom plan data (pass-through mode)
- `interval?: 'monthly' | 'yearly'` - Billing interval (default: 'monthly')
- `orientation?: 'horizontal' | 'vertical'` - Layout orientation
- `compact?: boolean` - Compact display mode
- `scale?: boolean` - Scale middle plan (visual emphasis)
- `ctaLabel?: string` - Call-to-action button label
- `selectedPlanId?: string` - Highlight plan as selected
- `controlled?: boolean` - Emit events instead of handling checkout

#### `<PricingTable>`

Display subscription plans in a feature comparison table format.

**Usage (Autonomous Mode):**
```vue
<template>
  <!-- Fetches and displays all plans in table format -->
  <PricingTable />

  <!-- Vertical orientation for mobile -->
  <PricingTable orientation="vertical" />
</template>
```

**Usage (Pass-Through Mode):**
```vue
<template>
  <!-- Pass custom plans to UPricingTable -->
  <PricingTable :plans="customPlans" orientation="horizontal" />
</template>
```

**Props:**
- All props from Nuxt UI's `<UPricingTable>` (pass-through mode)
- `plans?: any[]` - Custom plan data (pass-through mode)
- `interval?: 'monthly' | 'yearly'` - Billing interval (default: 'monthly')
- `orientation?: 'horizontal' | 'vertical'` - Table orientation
- `compact?: boolean` - Compact display mode
- `scale?: boolean` - Scale emphasis
- `ctaLabel?: string` - Call-to-action button label
- `selectedPlanId?: string` - Highlight plan as selected
- `controlled?: boolean` - Emit events instead of handling checkout

### Subscription Management Components

Components for managing active subscriptions:

#### `<CurrentSubscription>`

Display current subscription details. See detailed documentation in PRD.

#### `<PaymentMethod>`

Display and manage payment method. See detailed documentation in PRD.

#### `<InvoicesList>`

List and download user invoices. See detailed documentation in PRD.

## Composables

### `useBilling()`

The main billing composable providing reactive subscription state and portal access. Built on top of the auth layer's user profile for seamless integration.

> **Important:** The composable does NOT auto-initialize. You must explicitly call `ensureInitialized()` in your component's `onMounted` hook or when needed. This provides better control over data loading and prevents unnecessary API calls.

#### Reactive State

```typescript
interface BillingState {
  userProfile: UserProfile | null    // From auth layer (source of truth)
  currentPlan: BillingPlan | null    // User's current subscription plan
  availablePlans: BillingPlan[]      // All available billing plans
  isActive: boolean                  // Is subscription active
  status: string                     // Subscription status
  isLoading: boolean                 // Loading state for async operations
  error: string | null               // Error message if operation fails
}
```

#### Billing Methods

**Client-side only methods:**
- `createPortalSession(returnUrl?)` - Create Stripe Customer Portal session for management

**Universal methods (client & server):**
- `fetchSubscription()` - Fetch user's subscription data from profile
- `clearError()` - Clear current error state

#### Basic Usage

```vue
<script setup>
const {
  subscription,
  invoices,
  isLoading,
  subscriptionLoading,
  invoicesLoading,
  error,
  hasActivePaidSubscription,
  currentPlanId,
  isFreePlan,
  ensureInitialized,
  openPortal,
  refreshSubscription
} = useBilling()

// Initialize billing data once when component mounts
onMounted(async () => {
  await ensureInitialized()
})

// Open Stripe Customer Portal for all subscription management
const handleManageSubscription = async () => {
  try {
    await openPortal({ flow_type: 'subscription_update' })
  } catch (err) {
    console.error('Portal error:', error.value)
  }
}
</script>

<template>
  <div v-if="isLoading">Loading subscription...</div>
  <div v-else-if="hasActivePaidSubscription">
    <p>Current Plan: {{ subscription?.plan?.name }}</p>
    <p>Price: ${{ subscription?.plan?.price }}/{{ subscription?.plan?.interval }}</p>
    <p>Status: {{ subscription?.subscription?.status }}</p>
    <button @click="handleManageSubscription">Manage Subscription</button>
  </div>
  <div v-else>
    <p>No active subscription ({{ currentPlanId }})</p>
    <!-- Show available plans for upgrade -->
  </div>
</template>
```

#### Portal-First Subscription Management

```typescript
const handlePortalOperations = async () => {
  const result = await createPortalSession()

  // All subscription operations handled in Stripe Portal:
  // - Plan changes and upgrades
  // - Payment method updates
  // - Invoice downloads
  // - Subscription cancellation/reactivation
  // - Billing history

  if (result.success) {
    window.location.href = result.data.url
  }
}
```

## Server API Routes

### `/api/billing/subscription` (GET)

Get current user's subscription details from their profile. Uses auth layer for authentication.

```typescript
import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils/auth'
import { useUserServer } from '@starter-nuxt-amplify-saas/auth/composables/useUser'

export default defineEventHandler(async (event) => {
  // Authenticate and fetch user data
  await requireAuth(event)

  const { userProfile } = useUserServer()

  return {
    success: true,
    data: userProfile.value
  }
})
```

### `/api/billing/portal` (POST)

Create Stripe Customer Portal session for subscription management.

**Body:**
```typescript
{
  returnUrl?: string  // URL to return to after portal session
}
```

**Response:**
```typescript
{
  success: boolean
  data: {
    url: string         // Portal session URL
    created: number     // Session creation timestamp
    expires_at: number  // Session expiration timestamp
    customer: string    // Stripe customer ID
  }
}
```

### `/api/billing/webhook` (POST)

Stripe webhook endpoint for real-time subscription updates. Handles all subscription lifecycle events.

**Handles webhook events:**
- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription activated
- `customer.subscription.updated` - Subscription plan changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment processed successfully
- `invoice.payment_failed` - Payment failed

## Utils

### Plan Management Functions

```typescript
// Get all available billing plans from configuration
getAllPlans(): BillingPlan[]

// Get a specific plan by ID
getPlanById(planId: string): BillingPlan | undefined

// Get plan by Stripe price ID (reverse lookup)
getPlanByPriceId(priceId: string): BillingPlan | undefined
```

### Subscription Utilities

```typescript
// Check if user has active subscription
isSubscriptionActive(userProfile: UserProfile | null): boolean

// Get readable subscription status
getSubscriptionStatus(userProfile: UserProfile | null): string

// Format price for display
formatPrice(amount: number, currency?: string): string

// Handle billing errors with user-friendly messages
handleBillingError(error: any): string
```

### Plan Configuration

Plans are configured in `billing-plans.json` with a simple structure:

```typescript
interface BillingPlan {
  id: string              // Plan identifier
  name: string            // Display name
  description: string     // Plan description
  price: number           // Monthly price in dollars
  stripePriceId: string   // Stripe price ID
  features: string[]      // Feature list for display
}
```

When explicit typing is needed, import types directly from Stripe:

```typescript
import type Stripe from 'stripe'

// Stripe types are used directly for server-side operations
const customer: Stripe.Customer = // ... authenticated customer
```

The composables use TypeScript inference for most state and parameters, providing type safety without explicit interfaces.

### Utility Functions

```typescript
// Plan checking utilities
getPlanById('pro')                    // Get Pro plan
getPlanByPriceId('price_123')         // Find plan by Stripe price
isSubscriptionActive(userProfile)     // true/false

// Status and formatting
getSubscriptionStatus(userProfile)    // 'active', 'none', 'unknown'
formatPrice(2900)                     // '$29.00'

// Error handling with friendly messages
handleBillingError(error)             // 'Your payment was declined...'
```

## Usage Examples

### Complete Subscription Management

```vue
<!-- pages/settings/billing.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})

const {
  subscription,
  hasActivePaidSubscription,
  currentPlanId,
  openPortal,
  ensureInitialized,
  refreshSubscription,
  isLoading,
  error
} = useBilling()

// Initialize billing data once when page mounts
onMounted(async () => {
  await ensureInitialized()
})

const handleOpenPortal = async () => {
  try {
    await openPortal({ flow_type: 'subscription_update' })
  } catch (err) {
    console.error('Portal error:', err)
  }
}
</script>

<template>
  <div class="billing-dashboard">
    <div v-if="isLoading">Loading subscription data...</div>

    <div v-else-if="error" class="error">
      {{ error }}
      <button @click="refreshSubscription">Retry</button>
    </div>

    <div v-else-if="hasActivePaidSubscription" class="active-subscription">
      <div class="subscription-info">
        <h2>{{ subscription?.plan?.name }} Plan</h2>
        <p class="price">${{ subscription?.plan?.price }}/{{ subscription?.plan?.interval }}</p>
        <p class="status">Status: {{ subscription?.subscription?.status }}</p>

        <ul class="features">
          <li v-for="feature in subscription?.plan?.features" :key="feature">
            {{ feature }}
          </li>
        </ul>
      </div>

      <div class="billing-actions">
        <button @click="handleOpenPortal" class="btn-primary">
          Manage Subscription
        </button>
        <p class="portal-info">
          Use the Stripe portal to update payment methods, change plans,
          view invoices, or cancel your subscription.
        </p>
      </div>
    </div>

    <div v-else class="no-subscription">
      <h2>No Active Subscription</h2>
      <p>Current plan: {{ currentPlanId }}</p>
      <p>Choose a plan to get started with premium features.</p>
      <NuxtLink to="/pricing" class="btn-primary">
        View Plans
      </NuxtLink>
    </div>
  </div>
</template>
```

### Pricing Page with Plan Selection

```vue
<!-- pages/pricing.vue -->
<script setup>
const { availablePlans } = useBilling()
const { isAuthenticated } = useUser()

const selectPlan = (planId: string) => {
  if (!isAuthenticated.value) {
    navigateTo('/auth/login?redirect=/pricing')
    return
  }

  // Implement checkout flow or redirect to external checkout
  // For now, redirect to billing settings
  navigateTo('/settings/billing')
}
</script>

<template>
  <div class="pricing-page">
    <h1>Choose Your Plan</h1>

    <div class="plans-grid">
      <div
        v-for="plan in availablePlans"
        :key="plan.id"
        class="plan-card"
        :class="{ 'plan-free': plan.price === 0 }"
      >
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span v-if="plan.price === 0">Free</span>
          <span v-else>${{ plan.price }}<small>/month</small></span>
        </div>

        <p class="description">{{ plan.description }}</p>

        <ul class="features">
          <li v-for="feature in plan.features" :key="feature">
            {{ feature }}
          </li>
        </ul>

        <button
          @click="selectPlan(plan.id)"
          class="btn-plan"
          :class="{ 'btn-free': plan.price === 0 }"
        >
          {{ plan.price === 0 ? 'Get Started' : 'Subscribe' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

### Protected API Route with Subscription Check

```typescript
// server/api/premium/features.get.ts
export default defineEventHandler(async (event) => {
  // Authenticate using auth layer
  await requireAuth(event)

  // Get user data after authentication
  const { userProfile } = useUserServer()

  // Check subscription status using billing utilities
  const hasActiveSubscription = isSubscriptionActive(userProfile.value)

  if (!hasActiveSubscription) {
    throw createError({
      statusCode: 402,
      statusMessage: 'Active subscription required for premium features'
    })
  }

  // Get current plan for feature checking
  const currentPlan = userProfile.value?.stripePriceId
    ? getPlanByPriceId(userProfile.value.stripePriceId)
    : null

  return {
    success: true,
    data: {
      features: ['premium-analytics', 'advanced-reporting'],
      plan: currentPlan?.name,
      userId: userProfile.value?.userId
    }
  }
})
```

### Subscription Status Component

```vue
<script setup>
const { currentPlan, isActive, status } = useBilling()
</script>

<template>
  <div class="subscription-status">
    <div v-if="isActive" class="status-active">
      <Icon name="check-circle" class="text-green-500" />
      <span>{{ currentPlan?.name }} Plan Active</span>
    </div>

    <div v-else class="status-inactive">
      <Icon name="x-circle" class="text-red-500" />
      <span>No Active Subscription</span>
    </div>

    <p class="status-detail">Status: {{ status }}</p>
  </div>
</template>
```

## API Reference

### `useBilling()` Return Values

#### State Properties
- `userProfile: ComputedRef<UserProfile | null>` - User profile from auth layer
- `currentPlan: ComputedRef<BillingPlan | null>` - User's current subscription plan
- `availablePlans: ComputedRef<BillingPlan[]>` - All available billing plans
- `isActive: ComputedRef<boolean>` - Is subscription active
- `status: ComputedRef<string>` - Subscription status ('active', 'none', 'unknown')
- `isLoading: ComputedRef<boolean>` - Loading state for async operations
- `error: ComputedRef<string | null>` - Current error message

#### Methods (Client-side only)
- `createPortalSession(returnUrl?: string): Promise<BillingResponse>` - Create Stripe portal session

#### Methods (Universal - Client & Server)
- `fetchSubscription(): Promise<BillingResponse>` - Refresh subscription data
- `clearError(): void` - Clear current error state

### Error Handling

The layer includes comprehensive error handling with user-friendly messages:

```typescript
// Common Stripe errors are automatically mapped to friendly messages
'StripeCardError' → 'Your payment was declined. Please try a different payment method.'
'StripeRateLimitError' → 'Too many requests. Please try again later.'
'StripeInvalidRequestError' → 'Invalid request. Please contact support.'
'StripeAPIError' → 'Service error. Please try again later.'
'StripeConnectionError' → 'Network error. Please check your connection and try again.'
'StripeAuthenticationError' → 'Authentication error. Please contact support.'
```

All async methods return standardized responses:

```typescript
interface BillingResponse {
  success: boolean
  data?: any
  error?: string
}
```

This simplified billing layer provides essential subscription management functionality while maintaining the same clean architecture patterns established by the auth layer, with maximum delegation to Stripe's proven Customer Portal interface.
