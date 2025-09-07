#!/usr/bin/env node

/**
 * Billing Stripe Sync Script
 * 
 * This script reads billing plans from billing-plans.json and syncs them with Stripe
 * Run with: node scripts/billing-stripe-sync.js [--dry-run]
 * 
 * Prerequisites:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Login: stripe login
 * 3. Set environment: STRIPE_SECRET_KEY in .env
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { StripeAdmin } from '../layers/billing/utils/admin.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const plansPath = join(__dirname, '../apps/saas/app/billing-plans.json')

// Read environment variables
import dotenv from 'dotenv'
dotenv.config({ path: join(__dirname, '../apps/saas/.env') })

// Check for dry run flag
const isDryRun = process.argv.includes('--dry-run')

async function main() {
  console.log('🚀 Billing Stripe Sync\n')

  // Validate environment
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env file')
    process.exit(1)
  }

  try {
    // Initialize Stripe admin
    const stripeAdmin = new StripeAdmin(process.env.STRIPE_SECRET_KEY)
    
    // Load plans from JSON file
    console.log(`📖 Loading plans from: ${plansPath}`)
    const plans = stripeAdmin.loadPlansFromFile(plansPath)
    console.log(`✅ Loaded ${plans.length} plans\n`)
    
    // Run dry run or actual sync
    if (isDryRun) {
      await stripeAdmin.dryRun(plans)
      return
    }
    
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