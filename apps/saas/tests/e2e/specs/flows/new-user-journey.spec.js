import { test, expect } from '@playwright/test'
import { AuthHelpers } from '../../helpers/auth.js'
import { AssertionHelpers } from '../../helpers/assertions.js'
import { StripeHelpers } from '../../helpers/stripe.js'
import { TestCache } from '../../utils/cache.js'
import { Selectors } from '../../utils/selectors.js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'


test.describe.configure({ mode: 'serial' })

test.describe('New User Journey', () => {
  let testUser
  let testCard
  let page
  let context
  let auth
  let assertions
  let stripe

  test.beforeAll(async ({ browser }) => {
    // Create a persistent context and page for the entire journey
    context = await browser.newContext()
    page = await context.newPage()

    // Initialize helpers
    auth = new AuthHelpers(page)
    assertions = new AssertionHelpers(page)
    stripe = new StripeHelpers(page)

    // Build minimal journey data inline (load card from fixtures)
    const journeyType = (process.env.TEST_USER && process.env.TEST_PASS) ? 'existing-user' : 'new-user'
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const cardsPath = join(__dirname, '..', '..', 'fixtures', 'stripe-cards.json')
    if (!existsSync(cardsPath)) throw new Error('fixtures/stripe-cards.json not found')
    const cards = JSON.parse(readFileSync(cardsPath, 'utf8'))
    testCard = { ...cards.successCards.visa, expiryDate: cards.testData.defaultExpiry, cvc: cards.testData.defaultCvc, name: cards.testData.defaultName }

    if (journeyType === 'existing-user') {
      testUser = {
        email: process.env.TEST_USER,
        password: process.env.TEST_PASS,
        firstName: 'Test',
        lastName: 'User',
        source: 'environment',
        isReusable: true
      }
    } else {
      const timestamp = Date.now()
      const shortId = timestamp.toString().slice(-6)
      testUser = {
        email: `test+signup${shortId}@ontopix.ai`,
        password: 'TestPassword123!',
        firstName: 'Signup',
        lastName: `User${shortId}`,
        source: 'generated',
        isReusable: false,
        createdAt: new Date().toISOString()
      }
    }

    TestCache.clear('newly-created-user')
  })

  test.afterAll(async () => {
    await page.close()
    await context.close()
    TestCache.clear('newly-created-user')
  })

  test('1. User Signup with Email Verification', async () => {
    if (testUser.source === 'environment') {
      console.log(`Using existing user: ${testUser.email}`)
      TestCache.set('newly-created-user', testUser)
      return
    }

    console.log(`Creating new user: ${testUser.email}`)

    try {
      await auth.signup(testUser)
      await auth.verifyEmail(testUser.email)
      TestCache.set('newly-created-user', testUser)

      // Check if auto-logged in after verification
      const isLoggedIn = await auth.isLoggedIn()

      if (!isLoggedIn) {
        console.log('ℹ️  Not auto-logged in after verification, will login in Step 2')
      } else {
        console.log('✅ Auto-logged in after verification')
      }

      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/error')
      expect(currentUrl).not.toContain('/404')

      console.log('✅ User created and verified')

    } catch (error) {
      console.error(`❌ Step 1 failed: ${error.message}`)
      throw error
    }
  })

  test('2. User Login with Valid Credentials', async () => {
    try {
      const cachedUser = TestCache.get('newly-created-user')
      if (!cachedUser) {
        throw new Error('Test user not found in cache. Previous test may have failed.')
      }

      console.log(`Logging in: ${cachedUser.email}`)

      await auth.login(cachedUser)

      const isLoggedIn = await auth.isLoggedIn()
      expect(isLoggedIn).toBe(true)

      console.log('✅ Login successful')

    } catch (error) {
      console.error(`❌ Step 2 failed: ${error.message}`)
      throw error
    }
  })

  test('3. Verify Initial Plan State: Free Plan', async () => {
    try {
      const cachedUser = TestCache.get('newly-created-user')
      if (!cachedUser) {
        throw new Error('Test user not found in cache. Previous test may have failed.')
      }

      await auth.goto('/settings/billing')
      await page.waitForTimeout(3000)

      const currentUrl = page.url()
      expect(currentUrl).toContain('/settings/billing')

      await assertions.assertCurrentPlan('free')

      console.log('✅ Free plan verified')

    } catch (error) {
      console.error(`❌ Step 3 failed: ${error.message}`)
      throw error
    }
  })

  test('4. Verify Initial Payment Method State: No Payment Method', async () => {
    try {
      const cachedUser = TestCache.get('newly-created-user')
      if (!cachedUser) {
        throw new Error('Test user not found in cache. Previous test may have failed.')
      }

      await assertions.assertNoPaymentMethods()
      await assertions.assertNoInvoices()

      console.log('✅ No payment method verified')

    } catch (error) {
      console.error(`❌ Step 4 failed: ${error.message}`)
      throw error
    }
  })

  test('5. Add Payment Method (through Stripe Portal)', async () => {
    try {
      // Find and click "Add Payment Method" button (not "Change Plan")
      const addPaymentSelectors = Selectors.get('billing', 'addPaymentButton')

      let addPaymentButton = null
      for (const selector of addPaymentSelectors) {
        try {
          addPaymentButton = page.locator(selector).first()
          if (await addPaymentButton.isVisible({ timeout: 3000 })) {
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!addPaymentButton) {
        throw new Error('Add Payment Method button not found')
      }

      await addPaymentButton.click()
      await page.waitForTimeout(5000)

      const currentUrl = page.url()
      expect(currentUrl).toContain('billing.stripe.com')

      // Add payment method in portal
      await stripe.addPaymentMethodInPortal(testCard)

      // Return to app billing settings
      await stripe.returnToApp()
      await page.waitForTimeout(2000)

      // Navigate to billing page to verify
      await page.goto('http://localhost:3000/settings/billing')
      await page.waitForTimeout(2000)

      console.log('✅ Payment method added in portal and returned to app')

    } catch (error) {
      console.error(`❌ Step 5 failed: ${error.message}`)
      console.error(`Current URL: ${page.url()}`)
      throw error
    }
  })

  test('6. Verify New Payment Method State', async () => {
    try {
      // Already on billing page from Step 5
      // Wait a bit more for payment method to sync
      await page.waitForTimeout(3000)

      // Verify payment method exists
      await assertions.assertPaymentMethodExists('4242')

      console.log('✅ Payment method verified in app')

    } catch (error) {
      console.error(`❌ Step 6 failed: ${error.message}`)
      throw error
    }
  })

  test('7. Subscribe to Pro Plan', async () => {
    try {
      // Find and click portal button again
      const portalSelectors = Selectors.get('billing', 'manageSubscriptionButton')

      let portalButton = null
      for (const selector of portalSelectors) {
        try {
          portalButton = page.locator(selector).first()
          if (await portalButton.isVisible({ timeout: 3000 })) {
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!portalButton) {
        throw new Error('Billing portal button not found')
      }

      await portalButton.click()
      await page.waitForTimeout(5000)

      const currentUrl = page.url()
      expect(currentUrl).toContain('billing.stripe.com')

      // Change plan in portal
      await stripe.changePlanInPortal('pro')

      console.log('✅ Subscribed to Pro plan')

    } catch (error) {
      console.error(`❌ Step 7 failed: ${error.message}`)
      console.error(`Current URL: ${page.url()}`)
      throw error
    }
  })

  test('8. Verify Final Plan State: Pro Plan', async () => {
    try {
      // Return to app
      await stripe.returnToApp()
      await page.waitForTimeout(3000)

      const currentUrl = page.url()
      expect(currentUrl).toContain(auth.baseURL)

      // Navigate to billing page
      await auth.goto('/settings/billing')
      await page.waitForTimeout(3000)

      // Wait for subscription sync
      console.log('Waiting for subscription sync...')
      await assertions.waitForSubscriptionSync('pro')

      // Verify Pro subscription is active
      await assertions.assertSubscriptionActive('pro')

      console.log('✅ Pro plan verified')
      console.log('🎉 Journey completed successfully!')
      console.log(`User: ${testUser.email} | Plan: Pro | Card: ${testCard.description}`)

    } catch (error) {
      console.error(`❌ Step 8 failed: ${error.message}`)
      console.error(`Current URL: ${page.url()}`)
      throw error
    }
  })
})
