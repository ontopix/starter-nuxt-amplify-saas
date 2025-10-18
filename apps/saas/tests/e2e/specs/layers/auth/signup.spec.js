import { test, expect } from '@playwright/test'
import { AuthHelpers } from '../../../helpers/auth.js'
import { TestCache } from '../../../utils/cache.js'
import { Selectors } from '../../../utils/selectors.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

/**
 * Auth Layer - User Signup Tests
 *
 * Tests the user registration flow including:
 * - Account creation
 * - Email verification
 * - Auto-login after verification
 */
test.describe('Auth Layer - Signup', () => {
  let auth
  let testUsers

  test.beforeAll(async () => {
    // Clear cache before signup tests to ensure fresh registration
    TestCache.clear('newly-created-user')

    // Load test users from fixtures
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const fixturesPath = join(__dirname, '../../../fixtures/users.json')
    const fixturesData = JSON.parse(readFileSync(fixturesPath, 'utf8'))
    testUsers = fixturesData.testUsers
  })

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page)
  })

  test('should create new user and verify email', async ({ page }) => {
    console.log('=== TEST: User signup with email verification ===')

    // Create new user WITHOUT cache (fresh signup test)
    const testUser = await auth.createUser({ useCache: false })

    console.log(`📧 Created user: ${testUser.email}`)

    // Verify the verification success page/message appears
    const found = await Selectors.hasElement(page, 'auth', 'verificationSuccess', { timeout: 10000 })
    expect(found).toBe(true)

    console.log('✅ Email verification successful')
    console.log(`✅ User created and cached: ${testUser.email}`)
  })

  test('should handle signup with existing email', async ({ page }) => {
    console.log('=== TEST: Signup with existing email ===')

    // Use an existing user from fixtures (these users were already created by seed)
    const existingUser = testUsers.free[0]

    console.log(`Attempting to signup with existing email: ${existingUser.email}`)

    // Attempt to signup with existing email - helper will detect error
    await auth.signup({
      email: existingUser.email,
      password: existingUser.password,
      firstName: 'Duplicate',
      lastName: 'User'
    }, { expectError: true })

    // Verify we're still on signup page (signup failed as expected)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/auth/signup')

    console.log('✅ Duplicate signup handled correctly - stayed on signup page')
  })
})
