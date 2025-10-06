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
├── plugins/                 # Amplify initialization
│   ├── 01.amplify.client.ts # Client-side setup
│   └── 01.amplify.server.ts # Server-side setup
├── server/                  # Server-specific utilities
│   └── utils/
│       └── amplify.ts       # Server API routes utilities
├── utils/                   # Shared utilities
│   ├── graphql/            # Auto-generated GraphQL operations
│   │   ├── API.ts          # TypeScript types
│   │   ├── queries.ts      # Query operations
│   │   ├── mutations.ts    # Mutation operations
│   │   └── subscriptions.ts # Subscription operations
│   └── server.ts           # Legacy server utilities
├── types/                   # TypeScript definitions
│   └── nuxt-amplify.d.ts   # Nuxt plugin type extensions
├── amplify_outputs.json    # Auto-generated Amplify config
└── nuxt.config.ts          # Layer configuration
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

Configures Amplify for server-side operations within Nuxt application context. Provides cookie-based authentication and server context management.

**Provides:**
- `$Amplify.Auth` - Server-side authentication methods
- `$Amplify.Data.withContext()` - Authenticated data operations
- `$Amplify.GraphQL.client` - Server-side GraphQL client

## Server Utilities (`server/utils/amplify.ts`)

Server utilities for Nitro API routes (`server/api/**`) that don't have access to Nuxt application context.

**Functions:**
- `withAmplifyAuth(event, callback)` - Authenticated operations with user context
- `withAmplifyPublic(callback)` - Public operations without authentication

**Usage in API Routes:**
```typescript
// Authenticated endpoint
export default defineEventHandler(async (event) => {
  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'userPool' })
    const { data } = await client.models.UserProfile.get(contextSpec, { userId })
    return { data }
  })
})

// Public endpoint
export default defineEventHandler(async (event) => {
  return await withAmplifyPublic(async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'apiKey' })
    const { data } = await client.models.SubscriptionPlan.list(contextSpec, {
      filter: { isActive: { eq: true } }
    })
    return { data }
  })
})
```

## Utils & GraphQL

### Generated GraphQL Operations

Auto-generated from the backend schema with full TypeScript support. Generated via `pnpm amplify:sandbox:generate-graphql-client-code` command.

**Contains:**
- `API.ts` - Complete TypeScript type definitions for all models, inputs, and filters
- `queries.ts` - All available GraphQL query operations
- `mutations.ts` - All available GraphQL mutation operations
- `subscriptions.ts` - Real-time subscription operations

All operations include full TypeScript types and are automatically updated when the backend schema changes.

### Legacy Server Utilities (`utils/server.ts`)

Legacy server utilities maintained for backward compatibility. Consider migrating to `server/utils/amplify.ts` for new implementations.

## Usage Examples

### Client-Side Operations (Browser)

```vue
<script setup>
// Access Amplify client in browser
const { $Amplify } = useNuxtApp()

// Using Data models (recommended)
const fetchUserProfile = async (userId: string) => {
  try {
    const result = await $Amplify.Data.withContext(async (contextSpec) => {
      return await $Amplify.Data.client.models.UserProfile.get(contextSpec, { userId })
    })

    console.log('User profile:', result.data)
  } catch (error) {
    console.error('Failed to fetch profile:', error)
  }
}

// Using raw GraphQL (advanced)
import { listUserSubscriptions } from '~/layers/amplify/utils/graphql/queries'

const fetchSubscriptions = async () => {
  try {
    const result = await $Amplify.GraphQL.client.graphql({
      query: listUserSubscriptions,
      variables: {
        filter: { userId: { eq: 'user-123' } }
      }
    })

    console.log('Subscriptions:', result.data?.listUserSubscriptions?.items)
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
  }
}
</script>
```

### Server-Side API Routes (Nitro)

```typescript
// server/api/subscriptions.get.ts
import { generateClient } from 'aws-amplify/data/server'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'
import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'userPool' })

    const { data: userSubscription } = await client.models.UserSubscription.get(
      contextSpec,
      { userId: 'user-123' }
    )

    return {
      success: true,
      data: userSubscription
    }
  })
})
```

### Server-Side SSR (Nuxt Context)

```vue
<script setup lang="ts">
// In pages or components - server-side rendering
const { $Amplify } = useNuxtApp()

// This runs on server during SSR
const { data: subscriptionPlans } = await $Amplify.Data.withContext(async (contextSpec) => {
  return await $Amplify.Data.client.models.SubscriptionPlan.list(contextSpec, {
    filter: { isActive: { eq: true } }
  })
})

console.log('Plans loaded on server:', subscriptionPlans)
</script>

<template>
  <div>
    <h1>Available Plans</h1>
    <div v-for="plan in subscriptionPlans" :key="plan.planId">
      {{ plan.name }} - ${{ plan.monthlyPrice }}/month
    </div>
  </div>
</template>
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

### Type-Safe Composables

```typescript
// composables/useSubscriptions.ts
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'

export const useSubscriptions = () => {
  const { $Amplify } = useNuxtApp()

  const subscriptions = ref<Schema['UserSubscription']['type'][]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchUserSubscriptions = async (userId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await $Amplify.Data.withContext(async (contextSpec) => {
        return await $Amplify.Data.client.models.UserSubscription.list(contextSpec, {
          filter: { userId: { eq: userId } }
        })
      })

      subscriptions.value = result.data || []
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

### Public API Routes (No Authentication)

```typescript
// server/api/plans.get.ts
import { generateClient } from 'aws-amplify/data/server'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'
import { withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return await withAmplifyPublic(async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'apiKey' })

    const { data: plans } = await client.models.SubscriptionPlan.list(contextSpec, {
      filter: { isActive: { eq: true } }
    })

    return {
      success: true,
      data: { plans }
    }
  })
})
```

## API Reference

### Client Plugin (`$Amplify`)

#### `$Amplify.Auth`
- `fetchAuthSession()` - Get current user session
- `fetchUserAttributes()` - Get user profile attributes
- `getCurrentUser()` - Get current authenticated user

#### `$Amplify.Data`
- `client.models.*` - Type-safe data model operations
- `withContext(callback)` - Execute operations with proper auth context

#### `$Amplify.GraphQL.client`
- `graphql(options)` - Raw GraphQL operations
- Pre-configured with user pool authentication

#### `$Amplify.Storage`
- `uploadData(options)` - Upload files to S3
- `getUrl(options)` - Get signed URLs for files

### Server Utilities

#### `withAmplifyAuth(event, callback)`
- **Purpose:** Execute authenticated operations in Nitro API routes
- **Parameters:** H3Event for cookie extraction, callback with contextSpec
- **Auth Mode:** Uses user pool authentication from cookies
- **Returns:** Promise with callback result

#### `withAmplifyPublic(callback)`
- **Purpose:** Execute public operations without authentication
- **Parameters:** Callback with contextSpec
- **Auth Mode:** Uses API key authentication
- **Returns:** Promise with callback result

### Generated Types and Operations

All types and operations are automatically generated from the backend schema:

- **Types:** Complete TypeScript definitions in `utils/graphql/API.ts`
- **Queries:** All available queries in `utils/graphql/queries.ts`
- **Mutations:** All available mutations in `utils/graphql/mutations.ts`
- **Subscriptions:** Real-time operations in `utils/graphql/subscriptions.ts`

### Usage Patterns

- **Client-side:** Use `$Amplify` plugin with `useNuxtApp()`
- **SSR (Nuxt context):** Use `$Amplify.Data.withContext()` in pages/components
- **API routes (Nitro):** Use `withAmplifyAuth`/`withAmplifyPublic` from `server/utils/amplify.ts`
- **Composables:** Combine `$Amplify` with reactive state management

This layer provides complete AWS Amplify integration with proper SSR support and authentication patterns for all use cases.
