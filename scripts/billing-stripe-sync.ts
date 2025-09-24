#!/usr/bin/env node

/**
 * Billing Stripe Sync Script
 *
 * This script reads billing plans from a JSON file and syncs them with Stripe
 * Run with: node scripts/billing-stripe-sync.js <path-to-billing-plans.json>
 *
 * Prerequisites:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Login: stripe login
 * 3. Set environment: STRIPE_SECRET_KEY
 */

import Stripe from 'stripe'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Import the new SubscriptionPlan type
import type { SubscriptionPlan } from '@starter-nuxt-amplify-saas/billing/types'

interface SyncResult {
  success: boolean
  created: Array<{
    planId: string
    productId: string
    prices: Array<{ priceId: string; id: string }>
  }>
  updated: Array<{
    planId: string
    productId: string
    prices: Array<{ priceId: string; id: string }>
  }>
  skipped: Array<{
    planId: string
    productId: string
    prices: Array<{ priceId: string; id: string }>
  }>
  errors: Array<{
    planId: string
    error: string
  }>
}

/**
 * Admin utilities for managing Stripe products and prices
 */
class StripeAdmin {
  private stripe: Stripe

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new Error('Stripe secret key is required')
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia'
    })
  }

  /**
   * Validate plan configuration structure
   */
  validatePlanConfig(plans: SubscriptionPlan[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!Array.isArray(plans)) {
      errors.push('Plans must be an array')
      return { valid: false, errors }
    }

    const planIds = new Set<string>()

    for (const plan of plans) {
      if (!plan.id) errors.push('Plan missing required field: id')
      if (!plan.name) errors.push(`Plan ${plan.id} missing required field: name`)
      if (!Array.isArray(plan.features)) errors.push(`Plan ${plan.id} features must be an array`)
      if (!Array.isArray(plan.prices)) errors.push(`Plan ${plan.id} prices must be an array`)
      if (plan.prices && plan.prices.length === 0) errors.push(`Plan ${plan.id} must have at least one price`)

      // Validate prices
      if (plan.prices) {
        for (const price of plan.prices) {
          if (!price.id) errors.push(`Plan ${plan.id} has price missing id`)
          if (price.unitAmount === undefined || price.unitAmount === null || typeof price.unitAmount !== 'number' || price.unitAmount < 0) {
            errors.push(`Plan ${plan.id} price ${price.id} missing or invalid unitAmount`)
          }
          if (!price.currency) errors.push(`Plan ${plan.id} price ${price.id} missing currency`)
          if (!price.type || !['recurring', 'one_time'].includes(price.type)) {
            errors.push(`Plan ${plan.id} price ${price.id} invalid type`)
          }
          if (price.type === 'recurring' && (!price.interval || !['month', 'year'].includes(price.interval))) {
            errors.push(`Plan ${plan.id} price ${price.id} recurring price missing valid interval`)
          }
        }
      }

      if (planIds.has(plan.id)) errors.push(`Duplicate plan ID: ${plan.id}`)
      planIds.add(plan.id)
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Check if a product exists in Stripe by looking up existing products
   */
  async getExistingProduct(plan: SubscriptionPlan): Promise<{
    product: Stripe.Product | null
    prices: Stripe.Price[]
  }> {
    try {
      // First check if we have a stripeProductId stored
      if (plan.stripeProductId) {
        const product = await this.stripe.products.retrieve(plan.stripeProductId)
        const prices = await this.stripe.prices.list({ product: product.id })
        return { product, prices: prices.data }
      }

      // Otherwise look for existing products with our plan_id metadata
      const products = await this.stripe.products.search({
        query: `metadata['plan_id']:'${plan.id}'`
      })

      if (products.data.length > 0) {
        const product = products.data[0]
        const prices = await this.stripe.prices.list({ product: product.id })
        return { product, prices: prices.data }
      }

      return { product: null, prices: [] }
    } catch (error: any) {
      // Product doesn't exist
      return { product: null, prices: [] }
    }
  }

  /**
   * Check if product metadata needs updating
   */
  needsUpdate(existingProduct: Stripe.Product, plan: SubscriptionPlan): boolean {
    const currentMetadata = existingProduct.metadata
    const expectedFeatures = plan.features.join('|')

    return (
      existingProduct.name !== plan.name ||
      existingProduct.description !== plan.description ||
      currentMetadata.features !== expectedFeatures ||
      currentMetadata.plan_id !== plan.id
    )
  }

  /**
   * Create or update a single product and its prices in Stripe
   */
  async syncSingleProduct(plan: SubscriptionPlan): Promise<{
    product: Stripe.Product
    prices: Array<{ price: Stripe.Price; planPrice: any }>
    action: 'created' | 'updated' | 'skipped'
  }> {
    // Check if product already exists
    const existing = await this.getExistingProduct(plan)

    let product: Stripe.Product
    let action: 'created' | 'updated' | 'skipped' = 'skipped'

    if (existing.product) {
      // Product exists - check if it needs updating
      if (this.needsUpdate(existing.product, plan)) {
        // Update the existing product
        product = await this.stripe.products.update(existing.product.id, {
          name: plan.name,
          description: plan.description,
          metadata: {
            plan_id: plan.id,
            sync_source: 'billing_admin',
            features: plan.features.join('|')
          }
        })
        action = 'updated'
      } else {
        product = existing.product
        action = 'skipped'
      }
    } else {
      // Product doesn't exist - create new one
      product = await this.stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          plan_id: plan.id,
          sync_source: 'billing_admin',
          features: plan.features.join('|')
        }
      })
      action = 'created'
    }

    // Handle prices - create missing ones
    const prices: Array<{ price: Stripe.Price; planPrice: any }> = []

    for (const planPrice of plan.prices) {
      // Check if this price already exists
      const existingPrice = existing.prices.find(p =>
        p.metadata.plan_price_id === planPrice.id ||
        p.id === planPrice.stripePriceId
      )

      if (existingPrice) {
        prices.push({ price: existingPrice, planPrice })
      } else {
        // Create new price
        const priceData: Stripe.PriceCreateParams = {
          product: product.id,
          unit_amount: planPrice.unitAmount,
          currency: planPrice.currency.toLowerCase(),
          metadata: {
            plan_id: plan.id,
            plan_price_id: planPrice.id
          }
        }

        if (planPrice.type === 'recurring' && planPrice.interval) {
          priceData.recurring = {
            interval: planPrice.interval
          }
        }

        const newPrice = await this.stripe.prices.create(priceData)
        prices.push({ price: newPrice, planPrice })
      }
    }

    return { product, prices, action }
  }

  /**
   * Sync multiple products to Stripe
   */
  async syncProductsToStripe(plans: SubscriptionPlan[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: [],
      updated: [],
      skipped: [],
      errors: []
    }

    // Validate plans first
    const validation = this.validatePlanConfig(plans)
    if (!validation.valid) {
      result.success = false
      result.errors = validation.errors.map(error => ({ planId: 'validation', error }))
      return result
    }

    // Process each plan
    for (const plan of plans) {
      try {
        console.log(`📦 Processing plan: ${plan.name}`)

        const { product, prices, action } = await this.syncSingleProduct(plan)

        const planResult = {
          planId: plan.id,
          productId: product.id,
          prices: prices.map(p => ({ priceId: p.price.id, id: p.planPrice.id }))
        }

        switch (action) {
          case 'created':
            result.created.push(planResult)
            console.log(`✅ Created product: ${product.id}`)
            prices.forEach(p => console.log(`   Price: ${p.price.id} (${p.planPrice.id})`))
            break
          case 'updated':
            result.updated.push(planResult)
            console.log(`🔄 Updated product: ${product.id}`)
            prices.forEach(p => console.log(`   Price: ${p.price.id} (${p.planPrice.id})`))
            break
          case 'skipped':
            result.skipped.push(planResult)
            console.log(`⏭️  Skipped product: ${product.id} (no changes needed)`)
            break
        }

      } catch (error: any) {
        console.error(`❌ Error processing plan ${plan.id}:`, error.message)
        result.errors.push({
          planId: plan.id,
          error: error.message
        })
        result.success = false
      }
    }

    return result
  }

  /**
   * Update billing plans JSON file with new price IDs
   */
  updatePlansWithPriceIds(plansPath: string, syncResult: SyncResult): void {
    try {
      const plansContent = readFileSync(plansPath, 'utf8')
      const plans: SubscriptionPlan[] = JSON.parse(plansContent)

      // Create a map of all price updates
      const allUpdates = [...syncResult.created, ...syncResult.updated, ...syncResult.skipped]
      const priceUpdatesMap = new Map<string, Map<string, string>>()

      for (const update of allUpdates) {
        if (!priceUpdatesMap.has(update.planId)) {
          priceUpdatesMap.set(update.planId, new Map())
        }
        const planMap = priceUpdatesMap.get(update.planId)!
        for (const price of update.prices) {
          planMap.set(price.id, price.priceId)
        }
      }

      // Update price IDs in plans
      for (const plan of plans) {
        if (priceUpdatesMap.has(plan.id)) {
          const planPriceMap = priceUpdatesMap.get(plan.id)!
          for (const price of plan.prices) {
            if (planPriceMap.has(price.id)) {
              price.stripePriceId = planPriceMap.get(price.id)!
            }
          }
        }
      }

      // Write back to file with proper formatting
      writeFileSync(plansPath, JSON.stringify(plans, null, 2) + '\n')
      console.log(`✅ Updated ${plansPath} with new price IDs`)

    } catch (error: any) {
      throw new Error(`Failed to update plans file: ${error.message}`)
    }
  }

  /**
   * Get plan configuration from JSON file
   */
  loadPlansFromFile(plansPath: string): SubscriptionPlan[] {
    try {
      const plansContent = readFileSync(resolve(plansPath), 'utf8')
      return JSON.parse(plansContent)
    } catch (error: any) {
      throw new Error(`Failed to load plans from ${plansPath}: ${error.message}`)
    }
  }
}

// Get plans path from command line argument
const plansPath = process.argv[2]

if (!plansPath) {
  console.error('❌ Error: billing plans JSON file path is required')
  console.error('Usage: node scripts/billing-stripe-sync.js <path-to-billing-plans.json>')
  process.exit(1)
}

async function main() {
  console.log('🚀 Billing Stripe Sync\n')

  // Validate environment
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables')
    process.exit(1)
  }

  try {
    // Initialize Stripe admin
    const stripeAdmin = new StripeAdmin(process.env.STRIPE_SECRET_KEY)

    // Load plans from JSON file
    console.log(`📖 Loading plans from: ${plansPath}`)
    const plans = stripeAdmin.loadPlansFromFile(plansPath)
    console.log(`✅ Loaded ${plans.length} plans\n`)

    // Sync products to Stripe
    console.log('🔄 Syncing products to Stripe...\n')
    const result = await stripeAdmin.syncProductsToStripe(plans)

    // Display results
    if (result.success) {
      console.log('\n🎉 Sync completed successfully!\n')

      if (result.created.length > 0) {
        console.log('✅ Created products:')
        result.created.forEach(item => {
          console.log(`   ${item.planId}: ${item.productId}`)
          item.prices.forEach(price => {
            console.log(`     ${price.id}: ${price.priceId}`)
          })
        })
      }

      if (result.updated.length > 0) {
        console.log('\n🔄 Updated products:')
        result.updated.forEach(item => {
          console.log(`   ${item.planId}: ${item.productId}`)
          item.prices.forEach(price => {
            console.log(`     ${price.id}: ${price.priceId}`)
          })
        })
      }

      if (result.skipped.length > 0) {
        console.log('\n⏭️  Skipped products (no changes needed):')
        result.skipped.forEach(item => {
          console.log(`   ${item.planId}: ${item.productId}`)
          item.prices.forEach(price => {
            console.log(`     ${price.id}: ${price.priceId}`)
          })
        })
      }

      // Update plans file with new price IDs
      if (result.created.length > 0 || result.updated.length > 0) {
        console.log('\n📝 Updating billing-plans.json with new price IDs...')
        stripeAdmin.updatePlansWithPriceIds(plansPath, result)
      }

      console.log('\n📋 Next steps:')
      console.log('1. Restart your development server to pick up changes')
      console.log('2. Test the billing integration in your app')
      console.log('3. Verify products in Stripe dashboard')

    } else {
      console.log('\n❌ Sync failed with errors:\n')
      result.errors.forEach(error => {
        console.log(`   ${error.planId}: ${error.error}`)
      })
      process.exit(1)
    }

  } catch (error) {
    console.error(`❌ Script error: ${error.message}`)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Script cancelled by user')
  process.exit(0)
})

main().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})