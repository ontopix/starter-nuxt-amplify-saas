import { runAmplifyApi } from '@starter-nuxt-amplify-saas/amplify/utils/server'
import { generateClient } from 'aws-amplify/data/server'
import type { H3Event } from 'h3'
import type { UserSubscription, StripeCustomer, BillingUsage } from '../../types'

export async function getUserSubscription(event: H3Event, userId: string): Promise<UserSubscription | null> {
  try {
    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.UserSubscription.list(contextSpec, {
        filter: { userId: { eq: userId } }
      })

      if (errors) {
        console.error('Error fetching user subscription:', errors)
        return null
      }

      return data[0] || null
    })
  } catch (error) {
    console.error('Error in getUserSubscription:', error)
    return null
  }
}

export async function createUserSubscription(event: H3Event, userId: string, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription | null> {
  try {
    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.UserSubscription.create(contextSpec, {
        userId,
        planId: subscriptionData.planId || 'free',
        status: subscriptionData.status || 'active',
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false
      })

      if (errors) {
        console.error('Error creating user subscription:', errors)
        return null
      }

      return data
    })
  } catch (error) {
    console.error('Error in createUserSubscription:', error)
    return null
  }
}

export async function updateUserSubscription(event: H3Event, userId: string, updates: Partial<UserSubscription>): Promise<UserSubscription | null> {
  try {
    // First find the existing subscription
    const existing = await getUserSubscription(event, userId)
    if (!existing) {
      // Create new subscription if none exists
      return createUserSubscription(event, userId, updates)
    }

    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.UserSubscription.update(contextSpec, {
        id: existing.id,
        ...updates
      })

      if (errors) {
        console.error('Error updating user subscription:', errors)
        return null
      }

      return data
    })
  } catch (error) {
    console.error('Error in updateUserSubscription:', error)
    return null
  }
}

export async function getStripeCustomer(event: H3Event, userId: string): Promise<StripeCustomer | null> {
  try {
    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.StripeCustomer.list(contextSpec, {
        filter: { userId: { eq: userId } }
      })

      if (errors) {
        console.error('Error fetching Stripe customer:', errors)
        return null
      }

      return data[0] || null
    })
  } catch (error) {
    console.error('Error in getStripeCustomer:', error)
    return null
  }
}

export async function saveStripeCustomer(event: H3Event, userId: string, stripeCustomerId: string, email?: string, name?: string): Promise<StripeCustomer | null> {
  try {
    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.StripeCustomer.create(contextSpec, {
        userId,
        stripeCustomerId,
        email,
        name
      })

      if (errors) {
        console.error('Error saving Stripe customer:', errors)
        return null
      }

      return data
    })
  } catch (error) {
    console.error('Error in saveStripeCustomer:', error)
    return null
  }
}

export async function getUserIdFromStripeCustomer(event: H3Event, stripeCustomerId: string): Promise<string | null> {
  try {
    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.StripeCustomer.list(contextSpec, {
        filter: { stripeCustomerId: { eq: stripeCustomerId } }
      })

      if (errors) {
        console.error('Error finding user from Stripe customer:', errors)
        return null
      }

      return data[0]?.userId || null
    })
  } catch (error) {
    console.error('Error in getUserIdFromStripeCustomer:', error)
    return null
  }
}

export async function getBillingUsage(event: H3Event, userId: string, period?: string): Promise<BillingUsage | null> {
  try {
    // If no period specified, use current month
    const targetPeriod = period || new Date().toISOString().slice(0, 7) // YYYY-MM format

    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      const { data, errors } = await client.models.BillingUsage.list(contextSpec, {
        filter: { 
          userId: { eq: userId },
          period: { eq: targetPeriod }
        }
      })

      if (errors) {
        console.error('Error fetching billing usage:', errors)
        return null
      }

      return data[0] || {
        id: '',
        userId,
        period: targetPeriod,
        projects: 0,
        users: 0,
        storageBytes: 0,
        apiRequests: 0
      }
    })
  } catch (error) {
    console.error('Error in getBillingUsage:', error)
    return null
  }
}

export async function updateBillingUsage(event: H3Event, userId: string, period: string, usage: Partial<BillingUsage>): Promise<BillingUsage | null> {
  try {
    return await runAmplifyApi(event, async (contextSpec) => {
      const client = generateClient({ authMode: 'userPool' })
      
      // First try to find existing usage record
      const { data: existing, errors: fetchErrors } = await client.models.BillingUsage.list(contextSpec, {
        filter: { 
          userId: { eq: userId },
          period: { eq: period }
        }
      })

      if (fetchErrors) {
        console.error('Error fetching existing billing usage:', fetchErrors)
        return null
      }

      if (existing[0]) {
        // Update existing record
        const { data, errors } = await client.models.BillingUsage.update(contextSpec, {
          id: existing[0].id,
          ...usage
        })

        if (errors) {
          console.error('Error updating billing usage:', errors)
          return null
        }

        return data
      } else {
        // Create new record
        const { data, errors } = await client.models.BillingUsage.create(contextSpec, {
          userId,
          period,
          projects: usage.projects || 0,
          users: usage.users || 0,
          storageBytes: usage.storageBytes || 0,
          apiRequests: usage.apiRequests || 0
        })

        if (errors) {
          console.error('Error creating billing usage:', errors)
          return null
        }

        return data
      }
    })
  } catch (error) {
    console.error('Error in updateBillingUsage:', error)
    return null
  }
}