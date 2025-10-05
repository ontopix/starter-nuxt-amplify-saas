import { test, expect } from '@playwright/test'
import { AuthHelpers, generateTestUser } from '../helpers/auth.helpers.js'

test.describe.serial('Authentication', () => {
  let auth
  let signupUser // Shared between Test 1 and Test 2

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page)
  })

  test('signup with email verification', async ({ page }) => {
    // Generate a unique test user for this signup test
    signupUser = generateTestUser()
    console.log(`Testing signup for user: ${signupUser.email}`)

    // Perform actual signup process
    await auth.signup(signupUser)
    console.log('Signup completed, starting verification')

    await auth.verifyEmail(signupUser.email)
    console.log('Email verification completed')

    // Verify that verification was successful by checking for the success toast
    console.log('Looking for verification success toast...')
    const verificationToast = page.locator('text="Account verified successfully"')
    await expect(verificationToast).toBeVisible({ timeout: 10000 })
    console.log('Found "Account verified successfully" toast - test passed')
  })

  test('login with valid credentials', async ({ page }) => {
    // User was created in previous test, now login with fresh page
    if (!signupUser) {
      throw new Error('signupUser is undefined! The signup test may have failed or not run.')
    }

    await auth.login(signupUser)

    const loggedIn = await auth.isLoggedIn()
    expect(loggedIn).toBe(true)
  })

  test('login fails with invalid credentials', async ({ page }) => {
    await auth.login({
      email: 'invalid@example.com',
      password: 'WrongPassword123!'
    })

    // Wait for the toast to appear
    await page.waitForTimeout(2000)

    // Look for error message using specific selectors
    const errorSelectors = [
      ':text("Incorrect username or password")', // Most likely error message
      ':text("Invalid email or password")',      // Alternative error
      ':text("Error")',                          // Toast title
      '[role="alert"]',                          // Toast container
      '.toast'                                   // Toast element
    ]

    let errorFound = false
    for (const selector of errorSelectors) {
      try {
        const errorElement = page.locator(selector)
        if (await errorElement.isVisible({ timeout: 1000 })) {
          console.log(`✓ Found error: ${selector}`)
          errorFound = true
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Fallback: look for short error messages only (avoid CSS/JS)
    if (!errorFound) {
      const shortTextElements = await page.locator('*:visible').all()
      for (const element of shortTextElements) {
        try {
          const text = await element.textContent()
          // Only consider short texts (< 100 chars) that might be error messages
          if (text && text.length < 100 && text.length > 5) {
            if (text.includes('Incorrect') || text.includes('Invalid') ||
                (text.includes('Error') && !text.includes('css') && !text.includes('http'))) {
              console.log(`✓ Found error in text: "${text.substring(0, 50)}..."`)
              errorFound = true
              break
            }
          }
        } catch (e) {
          // Continue checking other elements
        }
      }
    }

    expect(errorFound).toBe(true)
  })
})
