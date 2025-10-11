import { expect } from '@playwright/test'
import Imap from 'node-imap'
import { simpleParser } from 'mailparser'
import fs from 'fs'
import path from 'path'

// ============================================================================
// Test Data
// ============================================================================


export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// User Management
// ============================================================================

import { TestCache } from '../utils/cache.js'
import { SelectorHelper } from '../utils/selectors.js'

// ============================================================================
// Gmail Helpers
// ============================================================================

function connectToGmail() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_USER || 'test@ontopix.ai',
      password: process.env.GMAIL_APP_PASSWORD || '',
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    })

    imap.once('ready', () => resolve(imap))
    imap.once('error', reject)
    imap.connect()
  })
}

function searchEmails(imap, emailAddress) {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', true, (err) => {
      if (err) return reject(err)

      const since = new Date()
      since.setMinutes(since.getMinutes() - 15)

      imap.search([['HEADER', 'TO', emailAddress], ['SINCE', since]], (err2, results) => {
        if (err2) return reject(err2)
        resolve((results || []).slice(-20))
      })
    })
  })
}

function fetchEmail(imap, uid) {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(uid, { bodies: '', markSeen: true })
    let emailData = ''

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          emailData += chunk.toString('utf8')
        })
      })
      msg.once('end', () => {
        simpleParser(emailData, (err, parsed) => {
          if (err) return reject(err)
          resolve(parsed)
        })
      })
    })

    fetch.once('error', reject)
  })
}

function extractCode(email) {
  const content = `${email.subject || ''}\n${email.text || ''}\n${email.html || ''}`
  const match = content.match(/\b(\d{6})\b/)
  return match ? match[1] : null
}

export async function getVerificationCode(emailAddress, timeoutMs = 60000) {
  const start = Date.now()
  let imap = null

  try {
    imap = await connectToGmail()

    while (Date.now() - start < timeoutMs) {
      const uids = await searchEmails(imap, emailAddress)

      for (const uid of uids.slice().reverse()) {
        const email = await fetchEmail(imap, uid)
        const code = extractCode(email)
        if (code) return code
      }

      await wait(4000)
    }

    return null
  } finally {
    if (imap) imap.end()
  }
}

// ============================================================================
// Auth Helpers
// ============================================================================

export class AuthHelpers {
  constructor(page) {
    this.page = page
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000'
  }

  async goto(path) {
    await this.page.goto(`${this.baseURL}${path}`)
  }

  /**
   * Find the first visible selector from a list of candidates
   */
  async findFirstVisibleSelector(selectors, timeout = 10000) {
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector)
        await element.waitFor({ state: 'visible', timeout: 2000 })
        console.log(`✓ Found element with selector: ${selector}`)
        return element
      } catch (error) {
        console.log(`✗ Selector not found: ${selector}`)
        continue
      }
    }
    throw new Error(`None of the selectors were found: ${selectors.join(', ')}`)
  }

  async signup({ email, firstName, lastName, password }) {
    console.log(`Starting signup for: ${email} (${firstName} ${lastName})`)

    await this.goto('/auth/signup')
    console.log('Navigated to signup page')

    // Fill form fields with flexible selectors
    try {
      // First Name - try multiple selectors
      const firstNameSelectors = [
        'input[name="firstName"]',
        'input[id="firstName"]',
        'input[placeholder*="first name" i]',
        'input[data-testid="firstName"]',
        'input[aria-label*="first name" i]',
        'form input:first-of-type'
      ]

      let firstNameInput = await this.findFirstVisibleSelector(firstNameSelectors)
      await firstNameInput.fill(firstName)
      console.log('Filled first name')

      // Last Name
      const lastNameSelectors = [
        'input[name="lastName"]',
        'input[id="lastName"]',
        'input[placeholder*="last name" i]',
        'input[data-testid="lastName"]',
        'input[aria-label*="last name" i]'
      ]

      let lastNameInput = await this.findFirstVisibleSelector(lastNameSelectors)
      await lastNameInput.fill(lastName)
      console.log('Filled last name')

      // Email
      const emailSelectors = [
        'input[name="email"]',
        'input[id="email"]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[data-testid="email"]',
        'input[aria-label*="email" i]'
      ]

      let emailInput = await this.findFirstVisibleSelector(emailSelectors)
      await emailInput.fill(email)
      console.log('Filled email')

      // Password
      const passwordSelectors = [
        'input[name="password"]',
        'input[id="password"]',
        'input[type="password"]',
        'input[placeholder*="password" i]',
        'input[data-testid="password"]',
        'input[aria-label*="password" i]'
      ]

      let passwordInput = await this.findFirstVisibleSelector(passwordSelectors)
      await passwordInput.fill(password)
      console.log('Filled password')

      // Submit button - try multiple texts and selectors
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Create account")',
        'button:has-text("Sign up")',
        'button:has-text("Register")',
        'button[data-testid="signup-submit"]',
        'input[type="submit"]',
        'form button:last-of-type'
      ]

      let submitButton = await this.findFirstVisibleSelector(submitSelectors)
      await submitButton.click()
      console.log('Clicked submit button')

      // Wait for form submission to complete
      await wait(2000)

      // Check for immediate errors
      const errorSelectors = [
        'text="error"',
        'text="failed"',
        'text="invalid"',
        '[role="alert"]',
        '.error',
        '.alert-error'
      ]

      for (const selector of errorSelectors) {
        try {
          const errorElement = this.page.locator(selector)
          if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent()
            console.log(`Found error during signup: ${errorText}`)
            throw new Error(`Signup failed with error: ${errorText}`)
          }
        } catch (e) {
          if (e.message.includes('Signup failed')) {
            throw e
          }
          // Continue checking other selectors
        }
      }

      const currentUrl = this.page.url()
      console.log(`URL after signup submission: ${currentUrl}`)

    } catch (error) {
      console.log(`Error during signup: ${error.message}`)
      throw error
    }
  }

  async verifyEmail(email) {
    console.log(`Starting email verification for: ${email}`)

    const code = await getVerificationCode(email)
    if (!code) throw new Error('Verification code not found')

    console.log(`Found verification code: ${code}`)

    // Try different input methods for verification code
    const otpInputs = this.page.locator('input[autocomplete="one-time-code"]')
    const count = await otpInputs.count()

    if (count >= 4) {
      console.log(`Found ${count} OTP inputs, filling individually`)
      const digits = code.split('')
      for (let i = 0; i < Math.min(digits.length, count); i++) {
        await otpInputs.nth(i).fill(digits[i])
        await wait(100) // Small delay between inputs
      }
    } else {
      console.log('Using single code input field')
      // Try multiple possible selectors for the code input
      const codeSelectors = [
        'input[name="code"]',
        'input[placeholder*="code"]',
        'input[placeholder*="Code"]',
        'input[placeholder*="verification"]'
      ]

      let codeInput = null
      for (const selector of codeSelectors) {
        try {
          codeInput = this.page.locator(selector).first()
          if (await codeInput.isVisible({ timeout: 1000 })) {
            console.log(`Found code input with selector: ${selector}`)
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (codeInput) {
        await codeInput.fill(code)
      } else {
        throw new Error('Could not find verification code input field')
      }
    }

    // Click submit button
    const submitSelectors = [
      'button:has-text("Verify Account")',
      'button:has-text("Verify")',
      'button:has-text("Confirm")',
      'button[type="submit"]'
    ]

    let submitButton = null
    for (const selector of submitSelectors) {
      try {
        submitButton = this.page.locator(selector).first()
        if (await submitButton.isVisible({ timeout: 1000 })) {
          console.log(`Found submit button with selector: ${selector}`)
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (submitButton) {
      await submitButton.click()
      console.log('Clicked verification submit button')
    } else {
      console.log('No submit button found, verification might be automatic')
    }

    // Wait for verification to complete - the toast will be checked by the test
    console.log('Waiting for verification to complete...')
    await wait(2000)

    const finalUrl = this.page.url()
    console.log(`URL after verification: ${finalUrl}`)
  }

  async login({ email, password }) {
    console.log(`Starting login for: ${email}`)

    await this.goto('/auth/login')
    console.log('Navigated to login page')

    try {
      // Email field - flexible selectors
      const emailSelectors = [
        'input[name="email"]',
        'input[id="email"]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[data-testid="email"]',
        'input[aria-label*="email" i]'
      ]

      let emailInput = await this.findFirstVisibleSelector(emailSelectors)
      await emailInput.fill(email)
      console.log('Filled email')

      // Password field - flexible selectors
      const passwordSelectors = [
        'input[name="password"]',
        'input[id="password"]',
        'input[type="password"]',
        'input[placeholder*="password" i]',
        'input[data-testid="password"]',
        'input[aria-label*="password" i]'
      ]

      let passwordInput = await this.findFirstVisibleSelector(passwordSelectors)
      await passwordInput.fill(password)
      console.log('Filled password')

      // Submit button - flexible selectors
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Login")',
        'button:has-text("Log in")',
        'button[data-testid="login-submit"]',
        'input[type="submit"]',
        'form button:last-of-type'
      ]

      let submitButton = await this.findFirstVisibleSelector(submitSelectors)
      await submitButton.click()
      console.log('Clicked login button')

      // Wait for login to process
      await wait(3000)

      const currentUrl = this.page.url()
      console.log(`URL after login submission: ${currentUrl}`)

      // Check for login errors (useful for debugging failed login tests)
      const errorSelectors = [
        'text="Invalid email or password"',
        'text="Error"',
        'text="Failed to sign in"',
        'text="NotAuthorizedException"',
        'text="UserNotFoundException"'
      ]

      for (const selector of errorSelectors) {
        try {
          const errorElement = this.page.locator(selector)
          if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent()
            console.log(`Login error detected: ${errorText}`)
            break
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

    } catch (error) {
      console.log(`Error during login: ${error.message}`)
      throw error
    }
  }

  async isLoggedIn() {
    // Wait longer for potential redirects and page loads
    await wait(5000)

    const url = this.page.url()
    console.log(`Current URL after waiting: ${url}`)

    // Check URL is not on auth pages
    const notOnAuthPage = !url.includes('/auth/login') && !url.includes('/auth/signup') && !url.includes('/auth/verify')

    if (!notOnAuthPage) {
      console.log('Still on auth page, not logged in')
      return false
    }

    // Try to find elements that indicate successful login
    try {
      // Look for common authenticated elements (user menu, dashboard content, etc.)
      const authElements = [
        'text="Dashboard"',
        'text="Settings"',
        'text="Profile"',
        'text="Logout"',
        'text="Sign out"',
        '[data-testid="user-menu"]',
        'nav:has-text("Dashboard")',
        'button:has-text("Sign out")',
        'text="Logged in successfully"'  // Toast that appears on successful login
      ]

      for (const selector of authElements) {
        try {
          const element = this.page.locator(selector).first()
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`Found authenticated element: ${selector}`)
            return true
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // If no specific auth elements found, check if we're on a reasonable page
      const isOnReasonablePage = url.includes('/dashboard') ||
                                 url.includes('/settings') ||
                                 url.includes('/profile') ||
                                 url === this.baseURL ||
                                 url === this.baseURL + '/'

      console.log(`On reasonable page (${url}): ${isOnReasonablePage}`)
      return isOnReasonablePage

    } catch (error) {
      console.log(`Error checking login status: ${error.message}`)
      // Fallback to URL check only
      return notOnAuthPage
    }
  }

  async logout() {
    try {
      const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out")').first()
      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click()
      }
    } catch (e) {
      // Logout not found, ignore
    }
  }

  /**
   * Create a new user with cache support
   */
  async createUser(options = { useCache: true }) {
    const cacheKey = 'newly-created-user'

    // Try to use cached user if enabled
    if (options.useCache) {
      const cachedUser = TestCache.get(cacheKey)
      if (cachedUser) {
        console.log(`Using cached user: ${cachedUser.email}`)
        return cachedUser
      }
    }

    // Generate new user
    const timestamp = Date.now()
    const shortId = timestamp.toString().slice(-6)
    const newUser = {
      email: `test+signup${shortId}@ontopix.ai`,
      password: 'TestPassword123!',
      firstName: 'Signup',
      lastName: `User${shortId}`,
      createdAt: new Date().toISOString()
    }

    // Perform signup
    await this.signup(newUser)
    console.log('Signup completed, starting verification')

    await this.verifyEmail(newUser.email)
    console.log('Email verification completed')

    // Cache the user for future use
    TestCache.set(cacheKey, newUser)
    console.log(`User cached: ${newUser.email}`)

    return newUser
  }
}
