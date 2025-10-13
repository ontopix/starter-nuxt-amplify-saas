import { test, expect } from '@playwright/test'
import { AuthHelpers } from '../../helpers/auth.js'
import { TestCache } from '../../utils/cache.js'
import { Selectors } from '../../utils/selectors.js'

test.describe.serial('Auth Layer Tests', () => {
  let auth
  let testUser

  test.beforeAll(async () => {
    // Clear cache before auth tests to ensure fresh signup
    TestCache.clear('newly-created-user')
  })

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page)
  })

  test('signup with email verification', async ({ page }) => {
    console.log('=== TEST: Signup with email verification ===')

    // Create new user WITHOUT cache (fresh signup test)
    testUser = await auth.createUser({ useCache: false })

    // Use configured selectors for verification success
    const found = await Selectors.hasElement(page, 'auth', 'verificationSuccess', { timeout: 10000 })
    expect(found).toBe(true)

    console.log(`✅ User created and cached: ${testUser.email}`)
  })

  test('login with valid credentials', async ({ page }) => {
    console.log('=== TEST: Login with valid credentials ===')

    // Use cached user from previous test
    testUser = await auth.createUser({ useCache: true })

    await auth.login(testUser)

    const loggedIn = await auth.isLoggedIn()
    expect(loggedIn).toBe(true)

    console.log(`✅ Login successful for: ${testUser.email}`)
  })

  test('login fails with invalid credentials', async ({ page }) => {
    console.log('=== TEST: Login with invalid credentials ===')

    await auth.login({
      email: 'invalid@example.com',
      password: 'WrongPassword123!'
    })

    await page.waitForTimeout(2000)

    // Use configured selectors for login error
    const found = await Selectors.hasElement(page, 'auth', 'loginError', { timeout: 2000 })

    if (found) {
      const element = await Selectors.findElement(page, 'auth', 'loginError')
      const text = await element.textContent()
      console.log(`✅ Found login error: "${text}"`)
    }

    expect(found).toBe(true)
    console.log('✅ Invalid credentials handled correctly')
  })
})
