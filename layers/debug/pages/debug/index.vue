<script setup lang="ts">
definePageMeta({
  layout: false
})

const {
  user,
  userAttributes,
  isAuthenticated,
  authStep,
  isLoading,
  error,
  displayName,
  email,
  getCurrentUser,
  fetchUserAttributes,
  getSessionInfo
} = useUser()

const sessionInfo = ref(null)

// Load session info on component mount if authenticated
onMounted(async () => {
  if (isAuthenticated.value) {
    sessionInfo.value = await getSessionInfo()
  }
})


// Computed for debug information
const debugInfo = computed(() => ({
  user: user.value || null,
  isAuthenticated: isAuthenticated.value || false,
  authStep: authStep.value || null,
  userAttributes: userAttributes.value || null,
  displayName: displayName.value || null,
  email: email.value || null,
  isLoading: isLoading.value || false,
  error: error.value || null,
  environment: {
    isDev: process.dev,
    nodeEnv: process.env.NODE_ENV,
    runtime: process.client ? 'client' : 'server'
  },
  lastUpdated: new Date().toISOString()
}))
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Page header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Debug Console</h1>
        <p class="text-gray-600">Development debugging interface</p>
        <div class="mt-4">
          <NuxtLink 
            to="/"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <Icon name="i-lucide-arrow-left" class="w-4 h-4" />
            Back to App
          </NuxtLink>
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert 
        v-if="error" 
        color="red" 
        variant="soft" 
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <!-- Profile Section -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="i-lucide-user" class="w-5 h-5" />
              <h3 class="font-semibold">Profile</h3>
            </div>
            <UButton 
              to="/debug/profile" 
              size="sm" 
              variant="soft" 
              icon="i-lucide-pen"
            >
              Edit Profile
            </UButton>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Display Name:</span>
              <span class="text-sm font-medium">{{ displayName || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Email:</span>
              <span class="text-sm">{{ email || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">User ID:</span>
              <span class="text-sm font-mono">{{ user?.userId || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Username:</span>
              <span class="text-sm">{{ user?.username || 'N/A' }}</span>
            </div>
          </div>
          
          <!-- Profile JSON -->
          <UAccordion :items="[{
            label: 'View Profile Data (JSON)',
            icon: 'i-lucide-code-2'
          }]">
            <template #content>
              <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                <pre class="text-xs">{{ JSON.stringify({
                  user: user,
                  userAttributes: userAttributes,
                  displayName: displayName,
                  email: email
                }, null, 2) }}</pre>
              </div>
            </template>
          </UAccordion>
        </div>
      </UCard>

      <!-- Session Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="i-lucide-shield-check" class="w-5 h-5" />
            <h3 class="font-semibold">Session</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Authentication:</span>
              <UBadge :color="isAuthenticated ? 'green' : 'red'" variant="subtle">
                {{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Auth Step:</span>
              <span class="text-sm">{{ authStep || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Loading:</span>
              <UBadge :color="isLoading ? 'yellow' : 'gray'" variant="subtle">
                {{ isLoading ? 'Loading' : 'Ready' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Environment:</span>
              <UBadge :color="debugInfo.environment.isDev ? 'yellow' : 'green'" variant="subtle">
                {{ debugInfo.environment.isDev ? 'Development' : 'Production' }}
              </UBadge>
            </div>
          </div>

          <!-- Session JSON -->
          <UAccordion :items="[{
            label: 'View Session Data (JSON)',
            icon: 'i-lucide-database'
          }]">
            <template #content>
              <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                <pre class="text-xs">{{ JSON.stringify({
                  isAuthenticated: isAuthenticated,
                  authStep: authStep,
                  isLoading: isLoading,
                  error: error,
                  environment: debugInfo.environment,
                  sessionInfo: sessionInfo,
                  lastFetched: new Date().toISOString()
                }, null, 2) }}</pre>
              </div>
            </template>
          </UAccordion>
        </div>
      </UCard>
    </div>
  </div>
</template>
