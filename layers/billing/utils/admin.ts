import Stripe from 'stripe'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

export interface PlanConfig {
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

export interface SyncResult {
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
 * These functions require elevated privileges and should only be used in admin scripts
 */
export class StripeAdmin {
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
   * List existing Stripe products with metadata
   */
  async listStripeProducts(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list({
      limit: 100,
      active: true
    })
    
    return products.data
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
   * Delete a Stripe product and all its prices
   */
  async deleteStripeProduct(productId: string): Promise<void> {
    // First, archive all prices for this product
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true
    })

    for (const price of prices.data) {
      await this.stripe.prices.update(price.id, { active: false })
    }

    // Then archive the product
    await this.stripe.products.update(productId, { active: false })
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

  /**
   * Dry run - show what would be created without actually doing it
   */
  async dryRun(plans: PlanConfig[]): Promise<void> {
    console.log('🔍 DRY RUN - No changes will be made\n')
    
    const validation = this.validatePlanConfig(plans)
    if (!validation.valid) {
      console.log('❌ Validation errors:')
      validation.errors.forEach(error => console.log(`  - ${error}`))
      return
    }

    console.log('📋 Plans to be created in Stripe:')
    for (const plan of plans) {
      console.log(`\n  📦 ${plan.name}`)
      console.log(`     ID: ${plan.id}`)
      console.log(`     Price: $${(plan.price / 100).toFixed(2)}/${plan.interval}`)
      console.log(`     Features: ${plan.features.length} features`)
      if (plan.stripePriceId) {
        console.log(`     Current Price ID: ${plan.stripePriceId}`)
      }
    }
    
    console.log('\n✅ Dry run complete. Run without --dry-run to create products.')
  }
}

// Convenience functions for the most common operations
export async function syncProductsToStripe(secretKey: string, plans: PlanConfig[]): Promise<SyncResult> {
  const admin = new StripeAdmin(secretKey)
  return admin.syncProductsToStripe(plans)
}

export async function listStripeProducts(secretKey: string): Promise<Stripe.Product[]> {
  const admin = new StripeAdmin(secretKey)
  return admin.listStripeProducts()
}

export function validatePlanConfig(plans: PlanConfig[]): { valid: boolean; errors: string[] } {
  const admin = new StripeAdmin('dummy_key') // Just for validation, no API calls
  return admin.validatePlanConfig(plans)
}