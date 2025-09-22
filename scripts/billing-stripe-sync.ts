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

// Types and interfaces
interface PlanConfig {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  stripePriceId?: string
  features: string[]
  popular?: boolean
  limits: {
    projects?: number
    users?: number
    storage?: string
    apiRequests?: number
  }
}

interface SyncResult {
  success: boolean
  created: Array<{
    planId: string
    productId: string
    priceId: string
  }>
  updated: Array<{
    planId: string
    productId: string
    priceId: string
  }>
  skipped: Array<{
    planId: string
    productId: string
    priceId: string
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
  validatePlanConfig(plans: PlanConfig[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!Array.isArray(plans)) {
      errors.push('Plans must be an array')
      return { valid: false, errors }
    }

    const planIds = new Set<string>()
    
    for (const plan of plans) {
      if (!plan.id) errors.push('Plan missing required field: id')
      if (!plan.name) errors.push(`Plan ${plan.id} missing required field: name`)
      if (plan.price === undefined || plan.price === null || typeof plan.price !== 'number' || plan.price < 0) errors.push(`Plan ${plan.id} missing or invalid price`)
      if (!plan.interval || !['month', 'year'].includes(plan.interval)) errors.push(`Plan ${plan.id} invalid interval`)
      if (!Array.isArray(plan.features)) errors.push(`Plan ${plan.id} features must be an array`)
      
      if (planIds.has(plan.id)) errors.push(`Duplicate plan ID: ${plan.id}`)
      planIds.add(plan.id)
    }
    
    return { valid: errors.length === 0, errors }
  }

  /**
   * Check if a product exists in Stripe by price ID
   */
  async getExistingProduct(stripePriceId: string): Promise<{
    product: Stripe.Product | null
    price: Stripe.Price | null
  }> {
    if (!stripePriceId) {
      return { product: null, price: null }
    }

    try {
      // Try to retrieve the price
      const price = await this.stripe.prices.retrieve(stripePriceId)
      
      // Get the associated product
      const product = await this.stripe.products.retrieve(price.product as string)
      
      return { product, price }
    } catch (error: any) {
      // Price or product doesn't exist
      return { product: null, price: null }
    }
  }

  /**
   * Check if product metadata needs updating
   */
  needsUpdate(existingProduct: Stripe.Product, plan: PlanConfig): boolean {
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
   * Create or update a single product and price in Stripe
   */
  async syncSingleProduct(plan: PlanConfig): Promise<{
    product: Stripe.Product
    price: Stripe.Price
    action: 'created' | 'updated' | 'skipped'
  }> {
    // Check if product already exists
    const existing = await this.getExistingProduct(plan.stripePriceId || '')
    
    if (existing.product && existing.price) {
      // Product exists - check if it needs updating
      if (this.needsUpdate(existing.product, plan)) {
        // Update the existing product
        const updatedProduct = await this.stripe.products.update(existing.product.id, {
          name: plan.name,
          description: plan.description,
          metadata: {
            plan_id: plan.id,
            sync_source: 'billing_admin',
            features: plan.features.join('|')
          }
        })
        
        return { 
          product: updatedProduct, 
          price: existing.price,
          action: 'updated'
        }
      } else {
        // No changes needed
        return { 
          product: existing.product, 
          price: existing.price,
          action: 'skipped'
        }
      }
    }
    
    // Product doesn't exist - create new one
    const product = await this.stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        plan_id: plan.id,
        sync_source: 'billing_admin',
        features: plan.features.join('|')
      }
    })

    // Create price
    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'usd',
      recurring: {
        interval: plan.interval
      },
      metadata: {
        plan_id: plan.id
      }
    })

    return { product, price, action: 'created' }
  }

  /**
   * Sync multiple products to Stripe
   */
  async syncProductsToStripe(plans: PlanConfig[]): Promise<SyncResult> {
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
        
        const { product, price, action } = await this.syncSingleProduct(plan)
        
        const planResult = {
          planId: plan.id,
          productId: product.id,
          priceId: price.id
        }
        
        switch (action) {
          case 'created':
            result.created.push(planResult)
            console.log(`✅ Created product: ${product.id}, price: ${price.id}`)
            break
          case 'updated':
            result.updated.push(planResult)
            console.log(`🔄 Updated product: ${product.id}, price: ${price.id}`)
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
  updatePlansWithPriceIds(plansPath: string, priceUpdates: Record<string, string>): void {
    try {
      const plansContent = readFileSync(plansPath, 'utf8')
      const plans: PlanConfig[] = JSON.parse(plansContent)
      
      // Update price IDs
      for (const plan of plans) {
        if (priceUpdates[plan.id]) {
          plan.stripePriceId = priceUpdates[plan.id]
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
  loadPlansFromFile(plansPath: string): PlanConfig[] {
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
          console.log(`   ${item.planId}: ${item.priceId}`)
        })
      }
      
      if (result.updated.length > 0) {
        console.log('\n🔄 Updated products:')
        result.updated.forEach(item => {
          console.log(`   ${item.planId}: ${item.priceId}`)
        })
      }
      
      if (result.skipped.length > 0) {
        console.log('\n⏭️  Skipped products (no changes needed):')
        result.skipped.forEach(item => {
          console.log(`   ${item.planId}: ${item.priceId}`)
        })
      }
      
      // Update plans file with new price IDs
      const priceUpdates = {}
      result.created.forEach(item => {
        priceUpdates[item.planId] = item.priceId
      })
      result.updated.forEach(item => {
        priceUpdates[item.planId] = item.priceId
      })
      
      if (Object.keys(priceUpdates).length > 0) {
        console.log('\n📝 Updating billing-plans.json with new price IDs...')
        stripeAdmin.updatePlansWithPriceIds(plansPath, priceUpdates)
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