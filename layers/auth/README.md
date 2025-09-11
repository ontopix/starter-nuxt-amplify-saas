# Auth Layer

A comprehensive authentication layer for Nuxt 3 applications using AWS Amplify and Cognito. This layer provides complete user authentication functionality including sign-in, sign-up, email verification, session management, and route protection.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Composables](#composables)
- [Middleware](#middleware)
- [Types & Utils](#types--utils)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The Auth layer integrates AWS Amplify Auth with Nuxt 3, providing:

- 🔐 Complete authentication flow (sign-in, sign-up, verification)
- 🛡️ Route protection via middleware  
- 🎨 Pre-built UI components with Nuxt UI
- 📱 SSR-compatible session management
- 🔄 Reactive user state management
- 📧 Email verification and password reset
- 🎯 TypeScript support throughout

## Architecture

```
layers/auth/
├── components/           # Pre-built auth UI components
│   └── Authenticator.vue # Multi-step auth form component
├── composables/          # Reactive auth state management
│   └── useUser.ts       # Main auth composable
├── middleware/          # Route protection
│   ├── auth.ts         # Protect authenticated routes
│   └── guest.ts        # Redirect authenticated users
├── types/              # TypeScript definitions
│   └── index.ts        # Auth interfaces and types
├── utils/              # Helper functions
│   └── index.ts        # Auth utilities and error handling
└── nuxt.config.ts      # Layer configuration
```

## Components

### `<Authenticator>`

A complete authentication component that handles sign-in, sign-up, and email verification flows.

#### Props

- `providers` - External auth providers (optional)
- `signInFields` - Custom sign-in form fields
- `signUpFields` - Custom sign-up form fields  
- `verifyFields` - Custom verification form fields
- `state` - Initial state: `'signin' | 'signup' | 'verify'`

#### Events

- `@signedIn` - Emitted when user successfully authenticates
- `@stateChange` - Emitted when auth flow state changes

#### Basic Usage

```vue
<template>
  <Authenticator 
    @signed-in="handleSignIn"
    :state="authState"
  />
</template>

<script setup>
const authState = ref('signin')

const handleSignIn = () => {
  // User is now authenticated
  navigateTo('/dashboard')
}
</script>
```

#### Custom Fields

```vue
<template>
  <Authenticator 
    :sign-in-fields="customSignInFields"
    :sign-up-fields="customSignUpFields"
  />
</template>

<script setup>
const customSignInFields = [
  {
    name: 'email',
    type: 'email',
    label: 'Email Address',
    placeholder: 'you@company.com',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    required: true
  }
]

const customSignUpFields = [
  {
    name: 'name',
    type: 'text',
    label: 'Full Name',
    required: true
  },
  {
    name: 'email',
    type: 'email', 
    label: 'Email Address',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    required: true
  }
]
</script>
```

## Composables

### `useUser()`

The main authentication composable providing reactive user state and auth methods.

#### Reactive State

```typescript
interface UserState {
  user: AuthUser | null              // Current user object
  userAttributes: Record<string, string> | null  // Cognito user attributes
  isAuthenticated: boolean           // Authentication status
  authStep: string                  // Current auth flow step
  isLoading: boolean                // Loading state
  error: string | null              // Error messages
  displayName: string               // Computed display name
  email: string                     // User email
}
```

#### Auth Methods

- `getCurrentUser()` - Check and load current user session
- `signIn(username, password)` - Sign in user
- `signUp(username, password, attributes?)` - Register new user
- `signOut(redirectTo?)` - Sign out user
- `confirmSignUp(username, code)` - Verify email with code
- `resendConfirmationCode(username)` - Resend verification code
- `updateUserAttributes(attributes)` - Update user profile
- `fetchUserAttributes()` - Reload user attributes
- `checkAuthSession()` - Check if session is valid

#### Basic Usage

```vue
<script setup>
const { 
  user, 
  isAuthenticated, 
  isLoading, 
  error,
  displayName,
  email,
  signIn, 
  signOut,
  getCurrentUser 
} = useUser()

// Initialize user session on app load
onMounted(async () => {
  await getCurrentUser()
})

// Sign in user
const handleSignIn = async () => {
  const result = await signIn('user@example.com', 'password123')
  
  if (result.success) {
    console.log(`Welcome ${displayName.value}!`)
    navigateTo('/dashboard')
  } else {
    console.error(result.error)
  }
}

// Sign out user
const handleSignOut = async () => {
  await signOut('/login')
}
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="isAuthenticated">
    <p>Welcome {{ displayName }}!</p>
    <button @click="handleSignOut">Sign Out</button>
  </div>
  <div v-else>
    <button @click="handleSignIn">Sign In</button>
  </div>
</template>
```

#### Advanced Usage

```typescript
// Multi-step authentication with MFA
const handleAdvancedSignIn = async (email: string, password: string) => {
  const { success, nextStep } = await signIn(email, password)
  
  if (!success && nextStep) {
    switch (nextStep.signInStep) {
      case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
        // Handle SMS MFA
        showSMSCodeInput()
        break
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        // Handle TOTP MFA
        showTOTPInput()
        break
      case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
        // Handle password reset
        showNewPasswordForm()
        break
    }
  }
}

// Update user profile
const updateProfile = async () => {
  const result = await updateUserAttributes({
    'given_name': 'John',
    'family_name': 'Smith',
    'custom:display_name': 'John Smith',
    'phone_number': '+1234567890'
  })
  
  if (result.success) {
    console.log('Profile updated successfully')
  }
}

// Check session validity
const checkSession = async () => {
  const isValid = await checkAuthSession()
  console.log('Session is valid:', isValid)
}
```

## Middleware

### `auth` Middleware

Protects routes by requiring authentication. Redirects unauthenticated users to login.

```vue
<script setup>
// Protect this page - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>
```

#### With Custom Redirect

```typescript
// middleware/custom-auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { checkAuthSession } = useUser()
  
  const isAuthenticated = await checkAuthSession()
  
  if (!isAuthenticated) {
    return navigateTo('/custom-login', {
      query: { redirect: to.fullPath }
    })
  }
})
```

### `guest` Middleware  

Redirects authenticated users away from auth pages (login, signup).

```vue
<script setup>
// Redirect authenticated users to dashboard
definePageMeta({
  middleware: 'guest'
})
</script>

<template>
  <!-- Login form - only shown to unauthenticated users -->
  <Authenticator />
</template>
```

## Types & Utils

### Authentication Types

```typescript
// User state interface
interface UserState {
  user: AuthUser | null
  userAttributes: Record<string, string> | null
  isAuthenticated: boolean
  authStep: string
  isLoading: boolean
  error: string | null
}

// Method response interface
interface AuthResponse {
  success: boolean
  error?: string
  nextStep?: any
  result?: any
}

// Sign-in parameters
interface SignInParams {
  username: string
  password: string
}

// Sign-up parameters  
interface SignUpParams {
  username: string
  password: string
  attributes?: Record<string, string>
}
```

### Utility Functions

```typescript
// Check if route needs authentication
isProtectedRoute('/dashboard')    // true
isProtectedRoute('/auth/login')   // false

// Check if route is auth-related
isAuthRoute('/auth/signup')       // true
isAuthRoute('/dashboard')         // false

// Get safe redirect URL
getRedirectUrl({ redirect: '/dashboard' })  // '/dashboard'
getRedirectUrl({ redirect: 'https://evil.com' })  // '/'

// Extract user display name
getUserDisplayName(user)  // 'John Smith' or fallback

// Extract user email
getUserEmail(user)        // 'user@example.com'

// Handle auth errors with friendly messages
handleAuthError(error)    // 'Invalid email or password'
```

## Usage Examples

### Complete Authentication Flow

```vue
<!-- pages/auth/login.vue -->
<script setup>
definePageMeta({
  middleware: 'guest',
  layout: 'auth'
})

const { isAuthenticated } = useUser()
const router = useRouter()

const handleSignedIn = () => {
  // Redirect to intended page or dashboard
  const redirect = router.currentRoute.value.query.redirect as string
  navigateTo(redirect || '/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full">
      <Authenticator 
        @signed-in="handleSignedIn"
        :state="'signin'"
      />
    </div>
  </div>
</template>
```

### Protected Dashboard

```vue
<!-- pages/dashboard/index.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})

const { user, displayName, email, signOut, isLoading } = useUser()

const handleSignOut = async () => {
  await signOut('/auth/login')
}
</script>

<template>
  <div v-if="isLoading">
    Loading dashboard...
  </div>
  
  <div v-else class="dashboard">
    <header class="flex justify-between items-center p-6">
      <h1>Dashboard</h1>
      <div class="flex items-center gap-4">
        <span>{{ displayName }}</span>
        <button @click="handleSignOut" class="btn-secondary">
          Sign Out
        </button>
      </div>
    </header>
    
    <main class="p-6">
      <p>Welcome back, {{ displayName }}!</p>
      <p>Your email: {{ email }}</p>
      <p>User ID: {{ user?.userId }}</p>
    </main>
  </div>
</template>
```

### User Profile Management

```vue
<!-- pages/profile.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})

const { userAttributes, updateUserAttributes, isLoading } = useUser()

const profileForm = ref({
  displayName: '',
  firstName: '',
  lastName: '',
  phone: ''
})

// Load current profile data
watchEffect(() => {
  if (userAttributes.value) {
    profileForm.value = {
      displayName: userAttributes.value['custom:display_name'] || '',
      firstName: userAttributes.value['given_name'] || '',
      lastName: userAttributes.value['family_name'] || '',
      phone: userAttributes.value['phone_number'] || ''
    }
  }
})

const updateProfile = async () => {
  const result = await updateUserAttributes({
    'custom:display_name': profileForm.value.displayName,
    'given_name': profileForm.value.firstName,
    'family_name': profileForm.value.lastName,
    'phone_number': profileForm.value.phone
  })
  
  if (result.success) {
    console.log('Profile updated successfully!')
  }
}
</script>

<template>
  <form @submit.prevent="updateProfile" class="max-w-md mx-auto">
    <h2>Edit Profile</h2>
    
    <div class="form-group">
      <label>Display Name</label>
      <input v-model="profileForm.displayName" type="text" required>
    </div>
    
    <div class="form-group">
      <label>First Name</label>
      <input v-model="profileForm.firstName" type="text">
    </div>
    
    <div class="form-group">
      <label>Last Name</label>
      <input v-model="profileForm.lastName" type="text">
    </div>
    
    <div class="form-group">
      <label>Phone Number</label>
      <input v-model="profileForm.phone" type="tel">
    </div>
    
    <button type="submit" :disabled="isLoading">
      {{ isLoading ? 'Updating...' : 'Update Profile' }}
    </button>
  </form>
</template>
```

### Session Management

```vue
<!-- plugins/auth-init.client.ts -->
export default defineNuxtPlugin(async () => {
  const { getCurrentUser, isAuthenticated } = useUser()
  
  // Initialize user session on app start
  await getCurrentUser()
  
  // Set up session refresh
  if (isAuthenticated.value) {
    // Refresh session every 30 minutes
    setInterval(async () => {
      await getCurrentUser()
    }, 30 * 60 * 1000)
  }
})
```

## API Reference

### `useUser()` Return Values

#### State Properties
- `user: ComputedRef<AuthUser | null>` - Current authenticated user
- `userAttributes: ComputedRef<Record<string, string> | null>` - User attributes from Cognito
- `isAuthenticated: ComputedRef<boolean>` - Authentication status  
- `authStep: ComputedRef<string>` - Current authentication step
- `isLoading: ComputedRef<boolean>` - Loading state for async operations
- `error: ComputedRef<string | null>` - Current error message
- `displayName: ComputedRef<string>` - Computed user display name
- `email: ComputedRef<string>` - User email address

#### Auth Methods
- `getCurrentUser(): Promise<AuthUser | null>` - Load current user session
- `signIn(username: string, password: string): Promise<AuthResponse>` - Authenticate user
- `signUp(username: string, password: string, attributes?: Record<string, string>): Promise<AuthResponse>` - Register user
- `signOut(redirectTo?: string): Promise<AuthResponse>` - Sign out user
- `confirmSignUp(username: string, code: string): Promise<AuthResponse>` - Verify email
- `resendConfirmationCode(username: string): Promise<AuthResponse>` - Resend verification
- `updateUserAttributes(attributes: Record<string, string>): Promise<AuthResponse>` - Update profile
- `fetchUserAttributes(): Promise<Record<string, string> | null>` - Reload attributes  
- `checkAuthSession(): Promise<boolean>` - Check session validity

### Error Handling

The layer includes comprehensive error handling with user-friendly messages:

```typescript
// Common errors are automatically mapped to friendly messages
'UserNotFoundException' → 'No account found with this email address'
'NotAuthorizedException' → 'Invalid email or password'  
'UserNotConfirmedException' → 'Please verify your email address before signing in'
'InvalidPasswordException' → 'Password does not meet requirements'
'UsernameExistsException' → 'An account with this email already exists'
'CodeMismatchException' → 'Invalid verification code'
'ExpiredCodeException' → 'Verification code has expired'
```

This comprehensive auth layer provides everything needed for secure user authentication in a Nuxt 3 application with AWS Amplify.