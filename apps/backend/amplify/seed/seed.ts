import { Amplify } from 'aws-amplify'
import * as auth from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../data/resource'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// Seed helpers from Amplify
import {
  getSecret,
  setSecret,
  createAndSignUpUser,
  signInUser,
  addToUserGroup
} from '@aws-amplify/seed'

type SeedPlan = {
  id: string
  name: string
  description?: string
  currency: string
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents
  lookupKeys: { monthly: string; yearly: string }
  features?: string[]
}

type SeedPlansFile = { plans: SeedPlan[] }

type SeedUser = {
  username: string
  password: string
  attributes?: Record<string, string>
  groups?: string[]
  planId?: string
  billingInterval?: 'month' | 'year'
}

type SeedUsersFile = { users: SeedUser[] }

async function loadAmplifyOutputs(): Promise<any> {
  // Try backend outputs first
  const candidates = [
    '../../amplify_outputs.json',
    '../../../layers/amplify/amplify_outputs.json'
  ]

  for (const rel of candidates) {
    try {
      const url = new URL(rel, import.meta.url)
      const outputs = JSON.parse(await readFile(url, { encoding: 'utf8' }))
      Amplify.configure(outputs)
      return outputs
    } catch {
      // continue
    }
  }
  throw new Error('Unable to load Amplify outputs (amplify_outputs.json)')
}

async function loadJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), relativePath)
  const normalized = process.platform === 'win32' && filePath.startsWith('/') ? filePath.slice(1) : filePath
  const content = await readFile(normalized, { encoding: 'utf8' })
  return JSON.parse(content) as T
}

async function ensureStripeSecret(): Promise<string> {
  try {
    return await getSecret('STRIPE_SECRET_KEY')
  } catch {
    const fromEnv = process.env.STRIPE_SECRET_KEY
    if (!fromEnv) {
      throw new Error('Missing STRIPE_SECRET_KEY. Set sandbox secret or env var.')
    }
    await setSecret('STRIPE_SECRET_KEY', fromEnv)
    return fromEnv
  }
}

type SeededPlanIds = Record<string, { productId: string; monthlyPriceId?: string; yearlyPriceId?: string; currency: string; monthlyPrice: number; yearlyPrice: number; name: string; description?: string }>

async function seedPlans(plansFile: SeedPlansFile): Promise<SeededPlanIds> {
  // Lazy import stripe only if needed
  const { default: Stripe } = await import('stripe')
  const stripeSecret = await ensureStripeSecret()
  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-12-18.acacia' as any })

  const result: SeededPlanIds = {}

  for (const plan of plansFile.plans) {
    // Upsert product by lookup key namespace: use product metadata id
    const productLookup = plan.id
    let product = (await stripe.products.search({
      query: `active:'true' AND metadata['app_plan_id']:'${productLookup}'`
    })).data[0]

    if (!product) {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { app_plan_id: plan.id }
      })
    } else {
      // Ensure name/description up to date
      await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description ?? undefined
      })
    }

    // Helper to upsert price by lookup_key
    async function upsertPrice(lookupKey: string, unitAmount: number, interval: 'month' | 'year') {
      // Search existing price by lookup_key
      const existing = (await stripe.prices.search({
        query: `active:'true' AND lookup_key:'${lookupKey}'`
      })).data[0]

      if (!existing) {
        const created = await stripe.prices.create({
          currency: plan.currency,
          unit_amount: unitAmount,
          recurring: { interval },
          product: product!.id,
          lookup_key: lookupKey,
          nickname: `${plan.name} ${interval}`
        })
        return created.id
      }

      // If amount/product differ, create a new price (Stripe best practice)
      const needsNew = existing.unit_amount !== unitAmount || existing.product !== product!.id
      if (needsNew) {
        const created = await stripe.prices.create({
          currency: plan.currency,
          unit_amount: unitAmount,
          recurring: { interval },
          product: product!.id,
          lookup_key: lookupKey,
          nickname: `${plan.name} ${interval}`
        })
        return created.id
      }
      return existing.id
    }

    const monthlyPriceId = await upsertPrice(plan.lookupKeys.monthly, plan.monthlyPrice, 'month')
    const yearlyPriceId = await upsertPrice(plan.lookupKeys.yearly, plan.yearlyPrice, 'year')

    result[plan.id] = {
      productId: product.id,
      monthlyPriceId: monthlyPriceId || undefined,
      yearlyPriceId: yearlyPriceId || undefined,
      currency: plan.currency.toUpperCase(),
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      name: plan.name,
      description: plan.description
    }
  }
  return result
}

async function seedUsers(usersFile: SeedUsersFile) {
  for (const u of usersFile.users) {
    try {
      await createAndSignUpUser({
        username: u.username,
        password: u.password,
        signInAfterCreation: true,
        signInFlow: 'Password',
        userAttributes: u.attributes
      })
    } catch (err) {
      if ((err as Error).name === 'UsernameExistsError') {
        await signInUser({ username: u.username, password: u.password, signInFlow: 'Password' })
      } else {
        throw err
      }
    }

    // Add groups if any
    if (u.groups && u.groups.length > 0) {
      for (const group of u.groups) {
        try {
          await addToUserGroup({ username: u.username }, group)
        } catch (e) {
          // Ignore if group does not exist in sandbox
        }
      }
    }

    try {
      await auth.signOut()
    } catch {
      // Ignore signOut failures when Auth isn't fully configured
    }
  }
}

async function upsertPlansInData(outputs: any, seeded: SeededPlanIds) {
  const client = generateClient<Schema>({ config: outputs, authMode: 'apiKey' })
  for (const [planId, data] of Object.entries(seeded)) {
    const subscriptionPlanData: any = {
      planId,
      name: data.name,
      description: data.description,
      monthlyPrice: data.monthlyPrice / 100, // store as dollars (float) per schema
      yearlyPrice: data.yearlyPrice / 100,
      priceCurrency: data.currency,
      stripeProductId: data.productId,
      isActive: true as const
    }
    if (data.monthlyPriceId) subscriptionPlanData.stripeMonthlyPriceId = data.monthlyPriceId
    if (data.yearlyPriceId) subscriptionPlanData.stripeYearlyPriceId = data.yearlyPriceId

    // Check existence
    const { data: existing } = await client.models.SubscriptionPlan.list({
      filter: { planId: { eq: planId } }
    })
    if (existing && existing.length > 0) {
      await client.models.SubscriptionPlan.update({ planId, ...subscriptionPlanData })
    } else {
      await client.models.SubscriptionPlan.create(subscriptionPlanData)
    }
  }
}

async function main() {
  const outputs = await loadAmplifyOutputs()

  const task = process.env.SEED_TASK ?? 'all'
  const plansPath = './data/plans.json'
  const usersPath = './data/users.json'

  let seededPlans: SeededPlanIds | undefined
  if (task === 'plans' || task === 'all') {
    const plans = await loadJsonFile<SeedPlansFile>(plansPath)
    seededPlans = await seedPlans(plans)
    // Populate DB with plans by default
    await upsertPlansInData(outputs, seededPlans)
  }

  if (task === 'users' || task === 'all') {
    const users = await loadJsonFile<SeedUsersFile>(usersPath)
    await seedUsers(users)
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exitCode = 1
})
