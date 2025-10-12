import { expect } from '@playwright/test'
import { SelectorHelper } from '../utils/selectors.js'

/**
 * Specialized helper for Stripe-specific operations
 */
export class StripeHelpers {
  constructor(page) {
    this.page = page
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000'
    this.timing = {
      fillDelay: 100,
      checkout: {
        redirectTimeout: 30000
      }
    }
  }

  /**
   * Fill Stripe Checkout form with provided card data
   */
  async fillCheckoutForm(cardData, options = {}) {
    const {
      skipEmail = false,
      skipBillingAddress = false,
      submitForm = true
    } = options

    console.log(`🔧 Filling Stripe Checkout with ${cardData.description || cardData.brand} card`)

    // Wait for Stripe Checkout to fully load
    await this.waitForCheckoutLoad()

    try {
      // Fill email if not pre-filled and not skipped
      if (!skipEmail) {
        await this.fillEmailField(cardData.email || 'test@example.com')
      }

      // Fill card details
      await this.fillCardNumber(cardData.number)
      await this.fillExpiryDate(cardData.expiryDate)
      await this.fillCVC(cardData.cvc)
      await this.fillCardholderName(cardData.name)

      // Fill billing address if required and not skipped
      if (!skipBillingAddress && cardData.address) {
        await this.fillBillingAddress(cardData.address)
      }

      // Submit the form if requested
      if (submitForm) {
        await this.submitCheckoutForm()
      }

      console.log('✅ Stripe Checkout form filled successfully')

    } catch (error) {
      console.error(`❌ Error filling Stripe Checkout: ${error.message}`)
      throw error
    }
  }

  /**
   * Wait for Stripe Checkout to fully load
   */
  async waitForCheckoutLoad() {
    const checkoutSelectors = SelectorHelper.get('stripe', 'checkoutForm')

    let loaded = false
    for (const selector of checkoutSelectors) {
      try {
        await this.page.locator(selector).waitFor({ timeout: 10000 })
        console.log(`✅ Checkout loaded: ${selector}`)
        loaded = true
        break
      } catch (e) {
        // Continue trying other selectors
      }
    }

    if (!loaded) {
      throw new Error('Stripe Checkout form did not load within timeout')
    }

    // Additional wait for Stripe Elements to initialize
    await this.page.waitForTimeout(2000)
  }

  /**
   * Fill email field in checkout
   */
  async fillEmailField(email) {
    const emailSelectors = SelectorHelper.get('stripe', 'emailInput')

    for (const selector of emailSelectors) {
      try {
        const emailInput = this.page.locator(selector).first()
        if (await emailInput.isVisible({ timeout: 2000 })) {
          await emailInput.fill(email)
          console.log('✅ Filled email field')
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log('ℹ️  Email field not found or not required')
  }

  /**
   * Fill card number field
   */
  async fillCardNumber(cardNumber) {
    const cardSelectors = SelectorHelper.get('stripe', 'cardNumber')

    for (const selector of cardSelectors) {
      try {
        const cardInput = this.page.locator(selector).first()
        if (await cardInput.isVisible({ timeout: 5000 })) {
          await cardInput.fill(cardNumber)
          await this.page.waitForTimeout(this.timing.fillDelay || 100)
          console.log('✅ Filled card number')
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    throw new Error('Card number input field not found')
  }

  /**
   * Fill expiry date field
   */
  async fillExpiryDate(expiryDate) {
    const expirySelectors = SelectorHelper.get('stripe', 'cardExpiry')

    for (const selector of expirySelectors) {
      try {
        const expiryInput = this.page.locator(selector).first()
        if (await expiryInput.isVisible({ timeout: 3000 })) {
          await expiryInput.fill(expiryDate)
          await this.page.waitForTimeout(this.timing.fillDelay || 100)
          console.log('✅ Filled expiry date')
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    throw new Error('Expiry date input field not found')
  }

  /**
   * Fill CVC field
   */
  async fillCVC(cvc) {
    const cvcSelectors = SelectorHelper.get('stripe', 'cardCvc')

    for (const selector of cvcSelectors) {
      try {
        const cvcInput = this.page.locator(selector).first()
        if (await cvcInput.isVisible({ timeout: 3000 })) {
          await cvcInput.fill(cvc)
          await this.page.waitForTimeout(this.timing.fillDelay || 100)
          console.log('✅ Filled CVC')
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    throw new Error('CVC input field not found')
  }

  /**
   * Fill cardholder name field
   */
  async fillCardholderName(name) {
    const nameSelectors = SelectorHelper.get('stripe', 'cardholderName')

    for (const selector of nameSelectors) {
      try {
        const nameInput = this.page.locator(selector).first()
        if (await nameInput.isVisible({ timeout: 2000 })) {
          await nameInput.fill(name)
          await this.page.waitForTimeout(this.timing.fillDelay || 100)
          console.log('✅ Filled cardholder name')
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log('ℹ️  Cardholder name field not found or not required')
  }

  /**
   * Fill billing address fields
   */
  async fillBillingAddress(address) {
    if (!address || Object.keys(address).length === 0) {
      console.log('ℹ️  No billing address provided, skipping')
      return
    }

    try {
      const billingAddressSelectors = SelectorHelper.get('stripe', 'billingAddress')
      const addressFields = [
        { selector: billingAddressSelectors.line1, value: address.line1 },
        { selector: billingAddressSelectors.line2, value: address.line2 },
        { selector: billingAddressSelectors.city, value: address.city },
        { selector: billingAddressSelectors.state, value: address.state },
        { selector: billingAddressSelectors.zip, value: address.postal_code }
      ]

      for (const field of addressFields) {
        if (!field.value) continue

        try {
          const input = this.page.locator(field.selector).first()
          if (await input.isVisible({ timeout: 1000 })) {
            await input.fill(field.value)
            await this.page.waitForTimeout(this.timing.fillDelay || 100)
          }
        } catch (e) {
          // Field might not be required, continue
        }
      }

      // Handle country dropdown
      if (address.country) {
        await this.selectCountry(address.country)
      }

      console.log('✅ Filled billing address')

    } catch (error) {
      console.log(`ℹ️  Could not fill all billing address fields: ${error.message}`)
      // Don't throw - address might not be required
    }
  }

  /**
   * Select country in billing address
   */
  async selectCountry(countryCode) {
    const countrySelectors = SelectorHelper.get('stripe', 'billingAddress.country')

    for (const selector of countrySelectors) {
      try {
        const countrySelect = this.page.locator(selector).first()
      if (await countrySelect.isVisible({ timeout: 1000 })) {
          await countrySelect.selectOption(countryCode)
          console.log(`✅ Selected country: ${countryCode}`)
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log('ℹ️  Country selector not found or not required')
  }

  /**
   * Submit the checkout form
   */
  async submitCheckoutForm() {
    const submitSelectors = SelectorHelper.get('stripe', 'submitButton')

    for (const selector of submitSelectors) {
      try {
        const submitButton = this.page.locator(selector).first()
        if (await submitButton.isVisible({ timeout: 5000 })) {
          await submitButton.click()
          console.log('✅ Clicked submit button')

          // Wait for form processing
          await this.page.waitForTimeout(2000)
          return
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    throw new Error('Submit button not found')
  }

  /**
   * Handle 3D Secure authentication if required
   */
  async handle3DSecure(shouldComplete = true) {
    console.log('🔐 Checking for 3D Secure authentication...')

    try {
      // Wait for 3DS challenge to appear
      const challengeSelectors = SelectorHelper.get('stripe', 'threeDSecure.challenge')

      let challengeFound = false
      for (const selector of challengeSelectors) {
        try {
          await this.page.locator(selector).waitFor({ timeout: 10000 })
          challengeFound = true
          console.log(`✅ 3D Secure challenge detected: ${selector}`)
          break
        } catch (e) {
          // Continue checking other selectors
        }
      }

      if (!challengeFound) {
        console.log('ℹ️  No 3D Secure challenge required')
        return true
      }

      // Handle the challenge
      if (shouldComplete) {
        return await this.complete3DSecure()
      } else {
        return await this.fail3DSecure()
      }

    } catch (error) {
      console.error(`❌ Error handling 3D Secure: ${error.message}`)
      return false
    }
  }

  /**
   * Complete 3D Secure authentication
   */
  async complete3DSecure() {
    const completeSelectors = SelectorHelper.get('stripe', 'threeDSecure.completeButton')

    for (const selector of completeSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible({ timeout: 5000 })) {
          await button.click()
          console.log('✅ Completed 3D Secure authentication')
          return true
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log('⚠️  Could not find 3D Secure complete button')
    return false
  }

  /**
   * Fail 3D Secure authentication (for testing failure scenarios)
   */
  async fail3DSecure() {
    const failSelectors = SelectorHelper.get('stripe', 'threeDSecure.failButton')

    for (const selector of failSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible({ timeout: 5000 })) {
          await button.click()
          console.log('✅ Failed 3D Secure authentication (intentionally)')
          return true
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log('⚠️  Could not find 3D Secure fail button')
    return false
  }

  /**
   * Wait for checkout completion and redirect
   */
  async waitForCheckoutCompletion() {
    console.log('⏳ Waiting for checkout completion...')

    try {
      // Wait for redirect back to our application
      await this.page.waitForURL(
        url => url.includes(this.baseURL) && !url.includes('stripe.com'),
        { timeout: this.timing.checkout?.redirectTimeout || 30000 }
      )

      console.log('✅ Checkout completed successfully')
      return true

    } catch (error) {
      console.error(`❌ Checkout completion timeout: ${error.message}`)

      // Log current URL for debugging
      const currentUrl = this.page.url()
      console.log(`Current URL: ${currentUrl}`)

      return false
    }
  }

  /**
   * Check for and handle checkout errors
   */
  async checkForCheckoutErrors() {
    const errorSelectors = SelectorHelper.get('stripe', 'errorSelectors')

    for (const selector of errorSelectors) {
      try {
        const errorElement = this.page.locator(selector).first()
        if (await errorElement.isVisible({ timeout: 2000 })) {
          const errorText = await errorElement.textContent()
          console.log(`❌ Checkout error detected: ${errorText}`)
          return errorText
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    return null
  }

  /**
   * Navigate Stripe Customer Portal
   */
  async navigatePortal(targetPlan) {
    console.log(`🏪 Navigating Stripe Customer Portal for plan: ${targetPlan}`)

    // Wait for portal to load
    await this.page.waitForTimeout(5000)

    try {
      // Log current URL and page content for debugging
      const currentUrl = this.page.url()
      console.log(`Portal URL: ${currentUrl}`)

      if (!currentUrl.includes('billing.stripe.com')) {
        throw new Error(`Not on Stripe Portal. Current URL: ${currentUrl}`)
      }

      // Look for plan selection options
      const planSelectors = SelectorHelper.get('stripe', 'portal.planSelection')

      let planFound = false
      for (const selector of planSelectors) {
        try {
          const element = this.page.locator(selector).first()
          if (await element.isVisible({ timeout: 3000 })) {
            await element.click()
            console.log(`✅ Clicked plan option: ${selector}`)
            planFound = true
            break
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      if (!planFound) {
        console.log('⚠️  No plan selection options found in portal')
        // Log available buttons for debugging
        await this.debugPortalContent()
        return false
      }

      // Look for confirmation button
      await this.page.waitForTimeout(2000)
      const confirmSelectors = SelectorHelper.get('stripe', 'portal.confirmButton')

      for (const selector of confirmSelectors) {
        try {
          const button = this.page.locator(selector).first()
          if (await button.isVisible({ timeout: 3000 })) {
            await button.click()
            console.log(`✅ Clicked confirmation: ${selector}`)
            break
          }
        } catch (e) {
          // Continue trying other buttons
        }
      }

      return true

    } catch (error) {
      console.error(`❌ Error navigating portal: ${error.message}`)
      return false
    }
  }

  /**
   * Debug portal content for troubleshooting
   */
  async debugPortalContent() {
    try {
      console.log('🔍 DEBUGGING STRIPE PORTAL CONTENT:')

      // Get page title
      const title = await this.page.title()
      console.log(`Page title: "${title}"`)

      // Get visible buttons
      const buttons = await this.page.locator('button:visible').all()
      console.log(`Found ${buttons.length} visible buttons:`)
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        try {
          const text = await buttons[i].textContent()
          if (text && text.trim()) {
            console.log(`  - Button: "${text.trim()}"`)
          }
        } catch (e) {
          // Skip if can't get text
        }
      }

      // Look for specific text content using centralized selectors
      const textSelectors = [
        'text="subscription"',
        'text="plan"',
        'text="update"',
        'text="change"'
      ]

      for (const selector of textSelectors) {
        try {
          const elements = await this.page.locator(selector).all()
          if (elements.length > 0) {
            console.log(`  ✅ Found "${selector}": ${elements.length} matches`)
          }
        } catch (e) {
          // Continue
        }
      }

    } catch (error) {
      console.log(`Error debugging portal: ${error.message}`)
    }
  }

  /**
   * Return to application from Stripe Portal
   */
  async returnToApp() {
    try {
      const returnSelectors = SelectorHelper.get('stripe', 'portal.returnButton')

      for (const selector of returnSelectors) {
        try {
          const returnButton = this.page.locator(selector).first()
          if (await returnButton.isVisible({ timeout: 5000 })) {
            await returnButton.click()
            console.log('✅ Clicked return button')
            return true
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      // If no return button found, navigate back manually
      console.log('ℹ️  No return button found, navigating back manually')
      await this.page.goto(`${this.baseURL}/settings/billing`)
      return true

    } catch (error) {
      console.error(`❌ Error returning to app: ${error.message}`)
      return false
    }
  }
}
