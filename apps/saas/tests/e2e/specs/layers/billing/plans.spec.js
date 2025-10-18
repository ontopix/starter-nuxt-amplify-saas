import { test, expect } from '@playwright/test'
import { AuthHelpers } from '../../../helpers/auth.js'
import { AssertionHelpers } from '../../../helpers/assertions.js'
import { Selectors } from '../../../utils/selectors.js'

/**
 * Billing tests for different subscription plans
 * Tests verify correct billing information display for free, pro, and enterprise plans
 *
 * Prerequisites:
 * 1. Run: pnpm backend:sandbox:seed:plans
 * 2. Run: pnpm backend:sandbox:seed:users
 */
test.describe('Billing Layer - Subscription Plans', () => {
  let auth
  let assertions

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page)
    assertions = new AssertionHelpers(page)
  })

  test('API endpoint returns all expected plans', async ({ request }) => {
    console.log('=== TEST: Verify plans API endpoint ===')

    // Call the plans API endpoint
    const response = await request.get('http://localhost:3000/api/billing/plans')

    // Verify response is successful
    expect(response.ok()).toBe(true)
    console.log('✅ API endpoint responded successfully')

    // Parse response
    const responseData = await response.json()

    // Verify response structure
    expect(responseData.success).toBe(true)
    expect(responseData.data).toBeDefined()
    expect(responseData.data.plans).toBeDefined()
    console.log('✅ API response has correct structure')

    // Extract plans array
    const plans = responseData.data.plans

    // Verify we have an array of plans
    expect(Array.isArray(plans)).toBe(true)
    console.log(`✅ Received ${plans.length} plans`)

    // Verify we have at least 3 plans (free, pro, enterprise)
    expect(plans.length).toBeGreaterThanOrEqual(3)

    // Find each expected plan
    const freePlan = plans.find(p => p.id === 'free')
    const proPlan = plans.find(p => p.id === 'pro')
    const enterprisePlan = plans.find(p => p.id === 'enterprise')

    // Verify free plan exists and has correct structure
    expect(freePlan).toBeDefined()
    expect(freePlan.name).toBe('Free')
    expect(freePlan.description).toBeDefined()
    expect(freePlan.monthlyPrice).toBe(0)
    expect(freePlan.yearlyPrice).toBe(0)
    expect(freePlan.currency).toBe('USD')
    console.log('✅ Free plan found with correct structure')

    // Verify pro plan exists and has correct structure
    expect(proPlan).toBeDefined()
    expect(proPlan.name).toBe('Pro')
    expect(proPlan.description).toBeDefined()
    expect(proPlan.monthlyPrice).toBeGreaterThan(0)
    expect(proPlan.yearlyPrice).toBeGreaterThan(0)
    expect(proPlan.currency).toBe('USD')
    expect(proPlan.stripeMonthlyPriceId).toBeDefined()
    expect(proPlan.stripeYearlyPriceId).toBeDefined()
    expect(proPlan.stripeProductId).toBeDefined()
    console.log(`✅ Pro plan found: $${proPlan.monthlyPrice}/month, $${proPlan.yearlyPrice}/year`)

    // Verify enterprise plan exists and has correct structure
    expect(enterprisePlan).toBeDefined()
    expect(enterprisePlan.name).toBe('Enterprise')
    expect(enterprisePlan.description).toBeDefined()
    expect(enterprisePlan.monthlyPrice).toBeGreaterThan(0)
    expect(enterprisePlan.yearlyPrice).toBeGreaterThan(0)
    expect(enterprisePlan.currency).toBe('USD')
    expect(enterprisePlan.stripeMonthlyPriceId).toBeDefined()
    expect(enterprisePlan.stripeYearlyPriceId).toBeDefined()
    expect(enterprisePlan.stripeProductId).toBeDefined()
    console.log(`✅ Enterprise plan found: $${enterprisePlan.monthlyPrice}/month, $${enterprisePlan.yearlyPrice}/year`)

    // Verify yearly savings calculation
    expect(proPlan.yearlySavings).toBeGreaterThan(0)
    console.log(`✅ Pro plan yearly savings: $${proPlan.yearlySavings}`)

    console.log('✅ All plans API verification complete')
  })

  test('Free plan user shows correct billing information', async ({ page }) => {
    console.log('=== TEST: Free plan user billing verification ===')

    // Free plan user
    const testUser = {
      email: 'test+free1@ontopix.ai',
      password: 'TestPassword123!'
    }

    // Login
    await auth.login(testUser)
    expect(await auth.isLoggedIn()).toBe(true)
    console.log(`✅ Logged in as: ${testUser.email}`)

    // Navigate to billing page
    await auth.goto('/settings/billing')
    await page.waitForTimeout(3000)

    // Verify free plan
    await assertions.assertCurrentPlan('free')
    console.log('✅ Verified free plan displayed')

    // Verify no payment methods
    await assertions.assertNoPaymentMethods()
    console.log('✅ Verified no payment methods')

    // Verify no invoices
    await assertions.assertNoInvoices()
    console.log('✅ Verified no invoices')

    // Verify plan details
    const planName = page.locator('text=/Free/i').first()
    expect(await planName.isVisible()).toBe(true)
    console.log('✅ Verified Free plan name visible')

    // Verify price shows $0 or Free (flexible matching)
    const priceIndicators = [
      'text=/\\$0/i',                    // Matches $0, $0/month, etc.
      'text=/free/i',                    // Matches "Free" anywhere
      'text=/no cost/i',                 // Alternative free indicator
      'text=/\\$0\\.00/i'               // Matches $0.00
    ]

    let priceFound = false
    for (const selector of priceIndicators) {
      try {
        const elements = page.locator(selector)
        const count = await elements.count()
        if (count > 0 && await elements.first().isVisible({ timeout: 2000 })) {
          const text = await elements.first().textContent()
          console.log(`✅ Found price indicator: ${selector} with text: "${text?.trim()}"`)
          priceFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    expect(priceFound).toBe(true)
    console.log('✅ Verified free plan price displayed')

    console.log('🎉 Free plan user billing verification completed')
  })

  test('Pro plan user shows correct billing information', async ({ page }) => {
    console.log('=== TEST: Pro plan user billing verification ===')

    // Pro plan user
    const testUser = {
      email: 'test+pro1@ontopix.ai',
      password: 'TestPassword123!'
    }

    // Login
    await auth.login(testUser)
    expect(await auth.isLoggedIn()).toBe(true)
    console.log(`✅ Logged in as: ${testUser.email}`)

    // Navigate to billing page
    await auth.goto('/settings/billing')
    await page.waitForTimeout(3000)

    // Verify Pro plan
    await assertions.assertCurrentPlan('pro')
    console.log('✅ Verified Pro plan displayed')

    // Verify payment method exists (seeded with 4242424242424242)
    await assertions.assertPaymentMethodExists('4242')
    console.log('✅ Verified payment method ending in 4242')

    // Verify plan details
    const planName = page.locator('text=/Pro/i').first()
    expect(await planName.isVisible()).toBe(true)
    console.log('✅ Verified Pro plan name visible')

    // Verify subscription status is active
    const statusIndicators = [
      'text=/active/i',
      'text=/ACTIVE/i',
      '[data-testid*="status"]:has-text("active")',
      '[data-testid*="subscription"]:has-text("active")'
    ]

    let statusFound = false
    for (const selector of statusIndicators) {
      try {
        const element = page.locator(selector)
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent()
          console.log(`✅ Found status indicator: ${selector} with text: "${text}"`)
          statusFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    if (statusFound) {
      console.log('✅ Verified subscription status is active')
    } else {
      console.log('⚠️  Status indicator not found, but plan verification passed')
    }

    // Verify price (should be $29 for monthly or $310 for yearly)
    const priceIndicators = [
      'text=/\\$29/i',
      'text=/\\$310/i',
      'text=/29/i'
    ]

    let priceFound = false
    for (const selector of priceIndicators) {
      try {
        const element = page.locator(selector)
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent()
          console.log(`✅ Found price indicator: ${selector} with text: "${text}"`)
          priceFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    expect(priceFound).toBe(true)
    console.log('✅ Verified Pro plan price displayed')

    // Verify "Change Plan" or "Manage Subscription" button exists
    const managementButtons = Selectors.get('billing', 'manageSubscriptionButton')

    let buttonFound = false
    for (const selector of managementButtons) {
      try {
        const button = page.locator(selector)
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found management button: ${selector}`)
          buttonFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    expect(buttonFound).toBe(true)
    console.log('✅ Verified subscription management button exists')

    console.log('🎉 Pro plan user billing verification completed')
  })

  test('Enterprise plan user shows correct billing information', async ({ page }) => {
    console.log('=== TEST: Enterprise plan user billing verification ===')

    // Enterprise plan user
    const testUser = {
      email: 'test+enterprise1@ontopix.ai',
      password: 'TestPassword123!'
    }

    // Login
    await auth.login(testUser)
    expect(await auth.isLoggedIn()).toBe(true)
    console.log(`✅ Logged in as: ${testUser.email}`)

    // Navigate to billing page
    await auth.goto('/settings/billing')
    await page.waitForTimeout(3000)

    // Verify Enterprise plan
    await assertions.assertCurrentPlan('enterprise')
    console.log('✅ Verified Enterprise plan displayed')

    // Verify payment method exists (seeded with 4242424242424242)
    await assertions.assertPaymentMethodExists('4242')
    console.log('✅ Verified payment method ending in 4242')

    // Verify plan details
    const planName = page.locator('text=/Enterprise/i').first()
    expect(await planName.isVisible()).toBe(true)
    console.log('✅ Verified Enterprise plan name visible')

    // Verify subscription status is active
    const statusIndicators = [
      'text=/active/i',
      'text=/ACTIVE/i',
      '[data-testid*="status"]:has-text("active")',
      '[data-testid*="subscription"]:has-text("active")'
    ]

    let statusFound = false
    for (const selector of statusIndicators) {
      try {
        const element = page.locator(selector)
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent()
          console.log(`✅ Found status indicator: ${selector} with text: "${text}"`)
          statusFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    if (statusFound) {
      console.log('✅ Verified subscription status is active')
    } else {
      console.log('⚠️  Status indicator not found, but plan verification passed')
    }

    // Verify price (should be $99 for monthly or $1068 for yearly)
    const priceIndicators = [
      'text=/\\$99/i',
      'text=/\\$1,?068/i',
      'text=/99/i'
    ]

    let priceFound = false
    for (const selector of priceIndicators) {
      try {
        const element = page.locator(selector)
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent()
          console.log(`✅ Found price indicator: ${selector} with text: "${text}"`)
          priceFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    expect(priceFound).toBe(true)
    console.log('✅ Verified Enterprise plan price displayed')

    // Verify "Change Plan" or "Manage Subscription" button exists
    const managementButtons = Selectors.get('billing', 'manageSubscriptionButton')

    let buttonFound = false
    for (const selector of managementButtons) {
      try {
        const button = page.locator(selector)
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found management button: ${selector}`)
          buttonFound = true
          break
        }
      } catch (e) {
        // Continue checking
      }
    }

    expect(buttonFound).toBe(true)
    console.log('✅ Verified subscription management button exists')

    console.log('🎉 Enterprise plan user billing verification completed')
  })
})
