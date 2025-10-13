import { test, expect } from '@playwright/test'
import { AuthHelpers } from '../../helpers/auth.js'
import { StripeHelpers } from '../../helpers/stripe.js'
import { AssertionHelpers } from '../../helpers/assertions.js'
import { TestCache } from '../../utils/cache.js'
import { Selectors } from '../../utils/selectors.js'

test.describe.serial('Billing Layer Tests - New User Flow', () => {
  let auth
  let stripe
  let assertions
  let testUser

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page)
    stripe = new StripeHelpers(page)
    assertions = new AssertionHelpers(page)
  })

  test('newly created user shows free plan with no payment methods', async ({ page }) => {
    console.log('=== TEST: Verify new user free plan state ===')

    // Get cached user from auth tests
    testUser = TestCache.get('newly-created-user')
    if (!testUser) {
      throw new Error('No cached user found. Run auth tests first.')
    }

    console.log(`Using cached user: ${testUser.email}`)

    // Login
    await auth.login(testUser)
    expect(await auth.isLoggedIn()).toBe(true)

    // Navigate to billing
    await auth.goto('/settings/billing')
    await page.waitForTimeout(3000)

    // Verify free plan
    await assertions.assertCurrentPlan('free')
    console.log('✅ Verified user is on free plan')

    // Verify no payment methods
    await assertions.assertNoPaymentMethods()
    console.log('✅ Verified no payment methods present')

    // Verify no invoices
    await assertions.assertNoInvoices()
    console.log('✅ Verified no invoices present')

    console.log('🎉 New user free plan state verified')
  })

  test.skip('add payment method via Stripe portal', async ({ page }) => {
    console.log('=== TEST: Add payment method ===')
    console.log('⚠️  This test is skipped - StripeHelpers methods not implemented yet')

    // TODO: Implement StripeHelpers methods:
    // - fillPaymentMethodForm()
    // - savePaymentMethod()
    // - selectPlan()
    // - completeCheckout()
  })

  test.skip('subscribe to Pro plan from free', async ({ page }) => {
    console.log('=== TEST: Free to Pro subscription ===')
    console.log('⚠️  This test is skipped - StripeHelpers methods not implemented yet')

    // TODO: Implement StripeHelpers methods:
    // - selectPlan()
    // - completeCheckout()
  })
})

test.describe('Billing Layer Tests - Seeded Users', () => {
  // TODO: Add tests using backend seeded users
  // These will test: upgrades, downgrades, plan changes, etc.

  test.skip('pro user upgrades to enterprise', async ({ page }) => {
    // Will implement later using DataManager.getSeededUser('pro', 1)
  })
})
