// TODO: Replace with proper server-side database calls
// For now using mock implementations to test Stripe integration

export async function getUserSubscription(userId: string) {
  console.log('Mock getUserSubscription called for userId:', userId)
  return null
}

export async function createUserSubscription(userId: string, subscriptionData: any) {
  console.log('Mock createUserSubscription called for userId:', userId, subscriptionData)
  return { id: 'mock-id', userId, ...subscriptionData }
}

export async function updateUserSubscription(userId: string, updates: any) {
  console.log('Mock updateUserSubscription called for userId:', userId, updates)
  return { id: 'mock-id', userId, ...updates }
}

export async function getStripeCustomer(userId: string) {
  console.log('Mock getStripeCustomer called for userId:', userId)
  return null
}

export async function saveStripeCustomer(userId: string, stripeCustomerId: string, email?: string, name?: string) {
  console.log('Mock saveStripeCustomer called:', { userId, stripeCustomerId, email, name })
  return { id: 'mock-id', userId, stripeCustomerId, email, name }
}

export async function getUserIdFromStripeCustomer(stripeCustomerId: string) {
  console.log('Mock getUserIdFromStripeCustomer called for stripeCustomerId:', stripeCustomerId)
  return null
}

export async function getBillingUsage(userId: string, period?: string) {
  console.log('Mock getBillingUsage called for userId:', userId, period)
  return {
    projects: 0,
    users: 0,
    storageBytes: 0,
    apiRequests: 0
  }
}

export async function updateBillingUsage(userId: string, period: string, usage: any) {
  console.log('Mock updateBillingUsage called:', { userId, period, usage })
  return { id: 'mock-id', userId, period, ...usage }
}