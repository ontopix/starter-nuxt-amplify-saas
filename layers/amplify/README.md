# Amplify Layer

AWS Amplify Gen2 integration layer for Nuxt 3 applications. This layer provides complete AWS Amplify setup including GraphQL API client, authentication, storage, and server-side rendering support.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Plugins](#plugins)
- [Utils & GraphQL](#utils--graphql)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The Amplify layer integrates AWS Amplify Gen2 with Nuxt 3, providing:

- 🔗 **GraphQL API Client** - Type-safe database operations
- 🔐 **Authentication Integration** - AWS Cognito auth mode
- 📁 **Storage Access** - S3 file upload/download utilities
- 🖥️ **SSR Support** - Server-side rendering compatibility
- 📱 **Generated Types** - Auto-generated TypeScript types from schema
- ⚡ **Pre-configured Client** - Ready-to-use Amplify client

## Architecture

```
layers/amplify/
├── plugins/              # Amplify initialization
│   ├── 01.amplify.client.ts  # Client-side setup
│   └── 01.amplify.server.ts  # Server-side setup
├── utils/                # GraphQL operations & utilities
│   ├── graphql/          # Generated GraphQL operations
│   │   ├── API.ts        # TypeScript types
│   │   ├── queries.ts    # Query operations
│   │   ├── mutations.ts  # Mutation operations
│   │   └── subscriptions.ts # Subscription operations
│   └── server.ts         # Server-side utilities
├── amplify_outputs.json  # Auto-generated Amplify config
└── nuxt.config.ts        # Layer configuration
```

## Plugins

### Client Plugin (`01.amplify.client.ts`)

Initializes Amplify on the client-side with SSR support and provides global access to Amplify APIs.

**Provides:**
- `$Amplify.Auth` - Authentication methods
- `$Amplify.GraphQL.client` - Type-safe GraphQL client  
- `$Amplify.Storage` - File upload/download utilities

**Configuration:**
- **Auth Mode**: `userPool` (AWS Cognito)
- **SSR**: Enabled for server-side rendering
- **Auto-config**: Uses `amplify_outputs.json`

### Server Plugin (`01.amplify.server.ts`)

Configures Amplify for server-side operations and API routes.

## Utils & GraphQL

### Generated GraphQL Operations

Auto-generated from the backend schema with full TypeScript support:

#### API Types (`utils/graphql/API.ts`)
```typescript
// Core data models
export type UserSubscription = {
  userId: string
  stripeSubscriptionId?: string
  planId: string
  status: string
  currentPeriodEnd?: Date
}

export type StripeCustomer = {
  userId: string
  stripeCustomerId: string
  email?: string
  name?: string
}

export type BillingUsage = {
  userId: string
  period: string
  projects?: number
  apiRequests?: number
}
```

#### Query Operations (`utils/graphql/queries.ts`)
```typescript
// Available queries
export const listUserSubscriptions = /* GraphQL */ `
  query ListUserSubscriptions($filter: ModelUserSubscriptionFilterInput) {
    listUserSubscriptions(filter: $filter) {
      items {
        userId
        planId
        status
        currentPeriodEnd
      }
    }
  }
`

export const getUserSubscription = /* GraphQL */ `
  query GetUserSubscription($userId: ID!) {
    getUserSubscription(userId: $userId) {
      userId
      stripeSubscriptionId
      planId
      status
    }
  }
`
```

#### Mutation Operations (`utils/graphql/mutations.ts`)
```typescript
// Available mutations
export const createUserSubscription = /* GraphQL */ `
  mutation CreateUserSubscription($input: CreateUserSubscriptionInput!) {
    createUserSubscription(input: $input) {
      userId
      planId
      status
      createdAt
    }
  }
`

export const updateUserSubscription = /* GraphQL */ `
  mutation UpdateUserSubscription($input: UpdateUserSubscriptionInput!) {
    updateUserSubscription(input: $input) {
      userId
      planId
      status
      updatedAt
    }
  }
`
```

### Server Utilities (`utils/server.ts`)

Server-side utilities for API routes and server functions.

## Usage Examples

### Basic GraphQL Operations

```vue
<script setup>
// Access the generated client
const { $Amplify } = useNuxtApp()
const client = $Amplify.GraphQL.client

// Import operations
import { listUserSubscriptions, createUserSubscription } from '~/layers/amplify/utils/graphql/queries'

// Query data
const fetchSubscriptions = async () => {
  try {
    const result = await client.graphql({
      query: listUserSubscriptions,
      variables: {
        filter: {
          userId: { eq: 'user-123' }
        }
      }
    })
    
    const subscriptions = result.data?.listUserSubscriptions?.items || []
    console.log('User subscriptions:', subscriptions)
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
  }
}

// Create new record
const createSubscription = async () => {
  try {
    const result = await client.graphql({
      query: createUserSubscription,
      variables: {
        input: {
          userId: 'user-123',
          planId: 'pro',
          status: 'active'
        }
      }
    })
    
    console.log('Created subscription:', result.data?.createUserSubscription)
  } catch (error) {
    console.error('Failed to create subscription:', error)
  }
}
</script>
```

### Server-Side API Routes

```typescript
// server/api/subscriptions.get.ts
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'
import { listUserSubscriptions } from '~/layers/amplify/utils/graphql/queries'

const client = generateClient<Schema>({
  authMode: 'userPool'
})

export default defineEventHandler(async (event) => {
  try {
    const result = await client.graphql({
      query: listUserSubscriptions
    })
    
    return {
      subscriptions: result.data?.listUserSubscriptions?.items || []
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch subscriptions'
    })
  }
})
```

### Storage Operations

```vue
<script setup>
const { $Amplify } = useNuxtApp()

// Upload file
const uploadFile = async (file: File) => {
  try {
    const result = await $Amplify.Storage.uploadData({
      path: `uploads/${file.name}`,
      data: file,
      options: {
        contentType: file.type
      }
    })
    
    console.log('Upload successful:', result)
    return result
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}

// Get file URL
const getFileUrl = async (path: string) => {
  try {
    const result = await $Amplify.Storage.getUrl({
      path,
      options: {
        expiresIn: 3600 // 1 hour
      }
    })
    
    return result.url
  } catch (error) {
    console.error('Failed to get file URL:', error)
    throw error
  }
}
</script>

<template>
  <div>
    <input type="file" @change="handleFileUpload" />
  </div>
</template>

<script>
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (file) {
    await uploadFile(file)
  }
}
</script>
```

### Type-Safe Composable Integration

```typescript
// composables/useSubscriptions.ts
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'
import { listUserSubscriptions } from '~/layers/amplify/utils/graphql/queries'

export const useSubscriptions = () => {
  const { $Amplify } = useNuxtApp()
  const client = $Amplify.GraphQL.client

  const subscriptions = ref<Schema['UserSubscription']['type'][]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchUserSubscriptions = async (userId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await client.graphql({
        query: listUserSubscriptions,
        variables: {
          filter: { userId: { eq: userId } }
        }
      })

      subscriptions.value = result.data?.listUserSubscriptions?.items || []
    } catch (err) {
      error.value = 'Failed to fetch subscriptions'
      console.error(err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    subscriptions: readonly(subscriptions),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchUserSubscriptions
  }
}
```

## API Reference

### Plugin Provides

#### `$Amplify.Auth`
- Authentication methods from `aws-amplify/auth`
- Used internally by auth layer
- Available for custom auth operations

#### `$Amplify.GraphQL.client`
- Type-safe GraphQL client
- Pre-configured with user pool auth
- Schema-based TypeScript support

#### `$Amplify.Storage`
- `uploadData(options)` - Upload files to S3
- `getUrl(options)` - Get signed URLs for files

### Generated Operations

#### Queries
- `listUserSubscriptions` - List user subscriptions with optional filters
- `getUserSubscription` - Get specific user subscription
- `listStripeCustomers` - List Stripe customer records
- `getBillingUsage` - Get usage metrics by period

#### Mutations
- `createUserSubscription` - Create new subscription
- `updateUserSubscription` - Update subscription details
- `deleteUserSubscription` - Remove subscription
- `createStripeCustomer` - Create Stripe customer record

#### Types
- `UserSubscription` - Subscription data model
- `StripeCustomer` - Customer data model  
- `BillingUsage` - Usage tracking model
- All generated types include proper TypeScript definitions

### Configuration

The layer automatically configures:
- **Auth Mode**: User pool authentication
- **SSR Support**: Server-side rendering compatibility
- **Type Generation**: Auto-generated from backend schema
- **Error Handling**: Built-in GraphQL error handling

This Amplify layer provides a complete foundation for AWS integration with type safety and SSR support built-in.