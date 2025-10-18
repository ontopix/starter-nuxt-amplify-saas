import { expect } from '@playwright/test'
import { Selectors } from '../utils/selectors.js'

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
    const checkoutSelectors = Selectors.get('stripe', 'checkoutForm')

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
    const emailSelectors = Selectors.get('stripe', 'emailInput')

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
    const cardSelectors = Selectors.get('stripe', 'cardNumber')

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
    const expirySelectors = Selectors.get('stripe', 'cardExpiry')

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
    const cvcSelectors = Selectors.get('stripe', 'cardCvc')

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
    const nameSelectors = Selectors.get('stripe', 'cardholderName')

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
      const billingAddressSelectors = Selectors.get('stripe', 'billingAddress')
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
    const countrySelectors = Selectors.get('stripe', 'billingAddress.country')

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
    const submitSelectors = Selectors.get('stripe', 'submitButton')

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
      const challengeSelectors = Selectors.get('stripe', 'threeDSecure.challenge')

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
    const completeSelectors = Selectors.get('stripe', 'threeDSecure.completeButton')

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
    const failSelectors = Selectors.get('stripe', 'threeDSecure.failButton')

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
    const errorSelectors = Selectors.get('stripe', 'errorSelectors')

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
      const planSelectors = Selectors.get('stripe', 'portal.planSelection')

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
      const confirmSelectors = Selectors.get('stripe', 'portal.confirmButton')

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
   * Add payment method in Stripe Customer Portal
   */
  async addPaymentMethodInPortal(cardData) {
    console.log('💳 Adding payment method in Stripe Portal...')

    try {
      const currentUrl = this.page.url()

      if (!currentUrl.includes('billing.stripe.com')) {
        throw new Error(`Not on Stripe Portal. Current URL: ${currentUrl}`)
      }

      // Check if we're already on the payment-methods page (form ready)
      const isOnPaymentMethodsPage = currentUrl.includes('payment-methods')

      if (!isOnPaymentMethodsPage) {
        // Look for "Add payment method" button if not already on the form
        const addPaymentSelectors = [
          'button:has-text("Add payment method")',
          'button:has-text("Add card")',
          'button:has-text("Add")',
          '[data-testid="add-payment-method"]'
        ]

        let addButtonClicked = false
        for (const selector of addPaymentSelectors) {
          try {
            const button = this.page.locator(selector).first()
            if (await button.isVisible({ timeout: 5000 })) {
              await button.click()
              console.log(`✅ Clicked add payment button: ${selector}`)
              addButtonClicked = true
              break
            }
          } catch (e) {
            // Continue trying other selectors
          }
        }

        if (!addButtonClicked) {
          throw new Error('Add payment method button not found in portal')
        }

        // Wait for payment-methods page to load
        await this.page.waitForTimeout(2000)
      } else {
        console.log('Already on payment-methods page, proceeding to fill form')
      }

      // Wait for payment form iframe to load
      console.log('Waiting for Stripe payment form to load...')
      await this.page.waitForTimeout(3000)

      // The portal uses Payment Element which is ALSO in an iframe
      // Look for the iframe containing the payment form
      const frames = this.page.frames()
      console.log(`Checking ${frames.length} frames for payment inputs...`)

      let paymentFrame = null
      for (const frame of frames) {
        try {
          const frameUrl = frame.url()
          // Payment Element iframe URL contains 'elements-inner-payment'
          if (frameUrl.includes('elements-inner-payment')) {
            const cardInput = await frame.locator('input[name="number"]').count()
            if (cardInput > 0) {
              paymentFrame = frame
              console.log(`✅ Found Payment Element iframe`)
              break
            }
          }
        } catch (e) {
          // Skip inaccessible frames
        }
      }

      if (paymentFrame) {
        console.log('Using fillPaymentElementInFrame')
        await this.fillPaymentElementInFrame(paymentFrame, cardData)
      } else {
        console.log('Falling back to fillStripeElementsForm')
        await this.fillStripeElementsForm(cardData)
      }

      // Submit the form - look for portal-specific submit buttons
      console.log('🔍 Looking for submit button in portal...')

      const portalSubmitSelectors = [
        'button:has-text("Add")',
        'button:has-text("Save")',
        'button:has-text("Update")',
        'button[type="submit"]',
        'button:has-text("Continue")'
      ]

      let submitButton = null
      for (const selector of portalSubmitSelectors) {
        try {
          console.log(`Trying selector: ${selector}`)
          const button = this.page.locator(selector).first()
          if (await button.isVisible({ timeout: 3000 })) {
            const isDisabled = await button.isDisabled().catch(() => false)
            console.log(`✅ Found button with selector: ${selector}, disabled: ${isDisabled}`)
            submitButton = button
            break
          }
        } catch (e) {
          console.log(`❌ Selector ${selector} not found`)
          // Continue to next selector
        }
      }

      if (!submitButton) {
        // Log all visible buttons for debugging
        console.log('🔍 Listing all visible buttons:')
        const allButtons = await this.page.locator('button').all()
        for (const btn of allButtons) {
          try {
            const text = await btn.textContent()
            const isVisible = await btn.isVisible()
            if (isVisible) {
              console.log(`  - Button text: "${text}"`)
            }
          } catch (e) {
            // Skip
          }
        }
        throw new Error('Submit button not found in portal')
      }

      // Wait for form validation and button to become enabled
      console.log('⏳ Waiting for form validation and button to enable...')

      // First, give Stripe time to validate the form
      await this.page.waitForTimeout(3000)

      // Now wait for the button to be enabled
      console.log('🔍 Waiting for button to be enabled...')

      // Poll the button state until it's enabled or timeout
      const startTime = Date.now()
      const timeout = 20000 // 20 seconds timeout
      let buttonEnabled = false

      while (Date.now() - startTime < timeout) {
        try {
          const isDisabled = await submitButton.isDisabled()
          const hasDisabledAttr = await submitButton.getAttribute('disabled')
          const ariaDisabled = await submitButton.getAttribute('aria-disabled')

          console.log(`Button state check - isDisabled: ${isDisabled}, disabled attr: ${hasDisabledAttr}, aria-disabled: ${ariaDisabled}`)

          if (!isDisabled && hasDisabledAttr === null && ariaDisabled !== 'true') {
            buttonEnabled = true
            console.log('✅ Submit button is now enabled!')
            break
          }

          console.log('⏳ Button still disabled, waiting 1s...')
          await this.page.waitForTimeout(1000)
        } catch (e) {
          console.log(`⚠️  Error checking button state: ${e.message}`)
          await this.page.waitForTimeout(1000)
        }
      }

      if (!buttonEnabled) {
        console.error('❌ Button did not enable within timeout period')
        // Take screenshot for debugging
        await this.page.screenshot({ path: 'test-results/button-disabled-timeout.png', fullPage: true })
        throw new Error('Submit button remained disabled after 20s timeout')
      }

      // Before clicking, check if there are any validation errors visible
      console.log('🔍 Checking for validation errors before submit...')
      const preErrorSelectors = [
        '[role="alert"]',
        '.error',
        '[class*="error"]',
        '[class*="Error"]'
      ]

      for (const selector of preErrorSelectors) {
        try {
          const error = this.page.locator(selector)
          if (await error.isVisible({ timeout: 500 })) {
            const errorText = await error.textContent()
            if (errorText && errorText.trim().length > 0) {
              console.error(`⚠️  Pre-submit error visible: ${errorText}`)
            }
          }
        } catch (e) {
          // Continue checking
        }
      }

      // 🎨 VISUAL DEBUG: Add red border to the button so we can see what we're clicking
      console.log('🎨 Adding red border to button for visual debugging...')
      try {
        await submitButton.evaluate(btn => {
          btn.style.border = '5px solid red'
          btn.style.outline = '5px solid red'
          btn.style.boxShadow = '0 0 10px 5px red'
        })
        console.log('✅ Red border added to button')

        // Take a screenshot with the red border
        await this.page.screenshot({ path: 'test-results/button-with-red-border.png', fullPage: true })
        console.log('📸 Screenshot taken: button-with-red-border.png')

        // Wait a bit so it's visible if running headed
        await this.page.waitForTimeout(1000)
      } catch (e) {
        console.log(`⚠️  Could not add red border: ${e.message}`)
      }

      console.log('🖱️  Attempting to click submit button...')
      const urlBeforeClick = this.page.url()
      console.log(`📍 URL before click: ${urlBeforeClick}`)

      // Get button info for debugging
      const buttonInfo = await submitButton.evaluate(btn => {
        const rect = btn.getBoundingClientRect()
        const styles = window.getComputedStyle(btn)
        return {
          text: btn.textContent,
          tagName: btn.tagName,
          type: btn.type,
          disabled: btn.disabled,
          inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
          position: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          zIndex: styles.zIndex,
          pointerEvents: styles.pointerEvents,
          visibility: styles.visibility,
          display: styles.display
        }
      })

      console.log('🔍 Button info:', JSON.stringify(buttonInfo, null, 2))

      // Scroll button into view if needed
      if (!buttonInfo.inViewport) {
        console.log('📜 Scrolling button into view...')
        await submitButton.scrollIntoViewIfNeeded()
        await this.page.waitForTimeout(500)
      }

      // Wait 5 seconds before clicking to let everything stabilize
      console.log('⏳ Waiting 5 seconds before clicking to let page stabilize...')
      await this.page.waitForTimeout(5000)
      console.log('✅ 5 second wait complete, proceeding with click')

      // Try multiple click strategies
      let clickSucceeded = false
      let clickError = null

      // Strategy 1: Scroll and regular click
      try {
        console.log('Strategy 1: Scroll + Regular click')
        await submitButton.scrollIntoViewIfNeeded()
        await this.page.waitForTimeout(500)
        await submitButton.click({ timeout: 5000 })
        console.log('✅ Regular click executed')
        clickSucceeded = true
      } catch (e) {
        clickError = e.message
        console.log(`⚠️  Regular click failed: ${e.message}`)
      }

      // Strategy 2: Force click (ignores overlays)
      if (!clickSucceeded) {
        try {
          console.log('Strategy 2: Force click (ignores overlays)')
          await submitButton.click({ force: true, timeout: 5000 })
          console.log('✅ Force click executed')
          clickSucceeded = true
        } catch (e) {
          console.log(`⚠️  Force click failed: ${e.message}`)
        }
      }

      // Strategy 3: Dispatch click event directly
      if (!clickSucceeded) {
        try {
          console.log('Strategy 3: Dispatch click event')
          await submitButton.evaluate(btn => {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            })
            btn.dispatchEvent(event)
          })
          console.log('✅ Click event dispatched')
          clickSucceeded = true
        } catch (e) {
          console.log(`⚠️  Dispatch click failed: ${e.message}`)
        }
      }

      // Strategy 4: Focus and press Enter
      if (!clickSucceeded) {
        try {
          console.log('Strategy 4: Focus + Enter key')
          await submitButton.focus()
          await this.page.waitForTimeout(500)
          await submitButton.press('Enter')
          console.log('✅ Enter key pressed')
          clickSucceeded = true
        } catch (e) {
          console.log(`⚠️  Enter key failed: ${e.message}`)
        }
      }

      // Strategy 5: Submit the form directly
      if (!clickSucceeded) {
        try {
          console.log('Strategy 5: Submit form directly')
          await submitButton.evaluate(btn => {
            const form = btn.closest('form')
            if (form) {
              form.submit()
            } else {
              btn.click()
            }
          })
          console.log('✅ Form submitted directly')
          clickSucceeded = true
        } catch (e) {
          console.log(`⚠️  Form submit failed: ${e.message}`)
        }
      }

      if (!clickSucceeded) {
        await this.page.screenshot({ path: 'test-results/click-failed.png', fullPage: true })
        throw new Error(`All click strategies failed. Last error: ${clickError}`)
      }

      // Wait for either navigation or error
      console.log('⏳ Waiting for form submission...')
      await this.page.waitForTimeout(5000)

      const urlAfterClick = this.page.url()
      console.log(`📍 URL after click: ${urlAfterClick}`)

      // Check for errors on the page after submission
      console.log('🔍 Checking for errors after submission...')
      const errorSelectors = [
        '[role="alert"]',
        '.error',
        '[class*="error"]',
        '[class*="Error"]',
        'text=/error/i',
        'text=/failed/i',
        'text=/invalid/i',
        'text=/incorrect/i'
      ]

      let errorFound = false
      let errorMessage = ''
      for (const selector of errorSelectors) {
        try {
          const error = this.page.locator(selector)
          if (await error.isVisible({ timeout: 1000 })) {
            const errorText = await error.textContent()
            if (errorText && errorText.trim().length > 0) {
              console.error(`❌ Error found on page: ${errorText}`)
              errorMessage = errorText
              errorFound = true
              break
            }
          }
        } catch (e) {
          // Continue checking
        }
      }

      if (errorFound) {
        await this.page.screenshot({ path: 'test-results/payment-method-error.png', fullPage: true })
        throw new Error(`Payment method form submission failed: ${errorMessage}`)
      }

      // Check if URL changed (successful submission)
      if (urlAfterClick !== urlBeforeClick) {
        console.log('✅ URL changed after click - form likely submitted')
      } else {
        console.log('⚠️  URL did not change after click - checking page state...')
      }

      // Wait for navigation to confirmation page or success
      try {
        await this.page.waitForURL('**/flow-confirmation**', { timeout: 10000 })
        console.log('✅ Payment method added - reached confirmation page')
        return true
      } catch (e) {
        console.log('ℹ️  Did not reach confirmation page within 10s')
      }

      // If no confirmation page, verify we're back to portal overview with the card
      const urlAfterWait = this.page.url()
      if (urlAfterWait.includes('billing.stripe.com')) {
        console.log('🔍 Verifying payment method was added in portal...')

        // Look for card ending in last 4 digits
        const cardNumber = cardData.number || cardData.card?.number || '4242424242424242'
        const lastFour = cardNumber.slice(-4)

        const cardSelectors = [
          `text="•••• ${lastFour}"`,
          `text="****${lastFour}"`,
          `text="${lastFour}"`,
          `text=/.*${lastFour}.*/i`
        ]

        let cardFound = false
        for (const selector of cardSelectors) {
          try {
            const element = this.page.locator(selector)
            if (await element.isVisible({ timeout: 3000 })) {
              console.log(`✅ Found card in portal: ${selector}`)
              cardFound = true
              break
            }
          } catch (e) {
            // Continue checking
          }
        }

        if (cardFound) {
          console.log('✅ Payment method verified in portal')
          return true
        } else {
          console.error('❌ Payment method not found in portal after submission')
          console.log('📸 Taking screenshot for debugging...')
          await this.page.screenshot({ path: 'test-results/payment-method-not-found.png', fullPage: true })
          throw new Error('Payment method was not added to portal (card not found)')
        }
      }

      console.log('✅ Payment method added successfully in portal')
      return true

    } catch (error) {
      console.error(`❌ Error adding payment method in portal: ${error.message}`)
      throw error
    }
  }

  /**
   * Fill Payment Element (used in Stripe Customer Portal)
   * This is different from fillStripeElementsForm as Payment Element uses direct inputs, not iframes
   */
  async fillPaymentElement(cardData) {
    console.log('💳 Filling Payment Element form...')

    try {
      // Card number
      const cardNumberInput = this.page.locator('input[name="number"]#Field-numberInput')
      await cardNumberInput.waitFor({ state: 'visible', timeout: 10000 })
      await cardNumberInput.fill(cardData.number)
      console.log('✅ Filled card number')

      // Expiry
      const expiryInput = this.page.locator('input[name="expiry"]#Field-expiryInput')
      await expiryInput.fill(cardData.expiryDate)
      console.log('✅ Filled expiry date')

      // CVC
      const cvcInput = this.page.locator('input[name="cvc"]#Field-cvcInput')
      await cvcInput.fill(cardData.cvc)
      console.log('✅ Filled CVC')

      // Country (if required)
      const countrySelect = this.page.locator('select[name="country"]#Field-countryInput')
      if (await countrySelect.isVisible({ timeout: 2000 })) {
        await countrySelect.selectOption('AD') // Andorra - no ZIP required
        console.log('✅ Selected country')
      }

      console.log('✅ Payment Element form filled successfully')
      return true

    } catch (error) {
      console.error(`❌ Error filling Payment Element: ${error.message}`)
      throw error
    }
  }

  /**
   * Fill Payment Element in iframe (used in Stripe Customer Portal)
   */
  async fillPaymentElementInFrame(frame, cardData) {
    console.log('💳 Filling Payment Element in iframe...')

    try {
      // Card number
      const cardNumberInput = frame.locator('input[name="number"]#Field-numberInput')
      await cardNumberInput.waitFor({ state: 'visible', timeout: 10000 })
      await cardNumberInput.fill(cardData.number)
      console.log('✅ Filled card number')

      // Expiry
      const expiryInput = frame.locator('input[name="expiry"]#Field-expiryInput')
      await expiryInput.fill(cardData.expiryDate)
      console.log('✅ Filled expiry')

      // CVC
      const cvcInput = frame.locator('input[name="cvc"]#Field-cvcInput')
      await cvcInput.fill(cardData.cvc)
      console.log('✅ Filled CVC')

      // Country (if required)
      const countrySelect = frame.locator('select[name="country"]#Field-countryInput')
      if (await countrySelect.isVisible({ timeout: 2000 })) {
        await countrySelect.selectOption('AD') // Andorra - no ZIP required
        console.log('✅ Selected country')
      }

      console.log('✅ Payment Element in iframe filled successfully')
      return true

    } catch (error) {
      console.error(`❌ Error filling Payment Element in iframe: ${error.message}`)
      throw error
    }
  }

  /**
   * Change plan in Stripe Customer Portal
   */
  async changePlanInPortal(planId) {
    console.log(`🔄 Changing plan to ${planId} in Stripe Portal...`)

    try {
      const currentUrl = this.page.url()

      if (!currentUrl.includes('billing.stripe.com')) {
        throw new Error(`Not on Stripe Portal. Current URL: ${currentUrl}`)
      }

      // Look for plan selection buttons
      const planSelectors = [
        `button:has-text("${planId}")`,
        `button:has-text("${planId.toUpperCase()}")`,
        `button:has-text("Subscribe to ${planId}")`,
        '[data-testid*="plan-option"]'
      ]

      let planButtonClicked = false
      for (const selector of planSelectors) {
        try {
          const button = this.page.locator(selector).first()
          if (await button.isVisible({ timeout: 5000 })) {
            await button.click()
            console.log(`✅ Clicked plan button: ${selector}`)
            planButtonClicked = true
            break
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      if (!planButtonClicked) {
        console.log('⚠️  No plan button found, trying generic "Select" or "Choose" buttons')
        const genericSelectors = Selectors.get('stripe', 'portal.planSelection')

        for (const selector of genericSelectors) {
          try {
            const button = this.page.locator(selector).first()
            if (await button.isVisible({ timeout: 3000 })) {
              await button.click()
              console.log(`✅ Clicked generic plan selector: ${selector}`)
              planButtonClicked = true
              break
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (!planButtonClicked) {
        throw new Error('Plan selection button not found in portal')
      }

      // Wait for confirmation dialog/screen
      await this.page.waitForTimeout(2000)

      // Look for confirmation button
      const confirmSelectors = Selectors.get('stripe', 'portal.confirmButton')

      let confirmButtonClicked = false
      for (const selector of confirmSelectors) {
        try {
          const button = this.page.locator(selector).first()
          if (await button.isVisible({ timeout: 5000 })) {
            await button.click()
            console.log(`✅ Clicked confirmation button: ${selector}`)
            confirmButtonClicked = true
            break
          }
        } catch (e) {
          // Continue
        }
      }

      if (!confirmButtonClicked) {
        console.log('⚠️  No explicit confirmation button found, assuming plan change submitted')
      }

      // Wait for plan change to process
      await this.page.waitForTimeout(3000)

      console.log(`✅ Plan changed to ${planId} successfully in portal`)
      return true

    } catch (error) {
      console.error(`❌ Error changing plan in portal: ${error.message}`)
      throw error
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
      const returnSelectors = Selectors.get('stripe', 'portal.returnButton')

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

  /**
   * Wait for Stripe Elements to be fully ready for interaction
   */
  async waitForStripeElementsReady() {
    console.log('⏳ Waiting for Stripe Elements to be ready...')

    try {
      // Wait for main iframe to be present
      await this.page.waitForSelector('iframe[title="Secure payment input frame"]', { timeout: 15000 })
      console.log('✅ Stripe iframe found')

      // Additional wait for iframe content to load
      await this.page.waitForTimeout(3000)

      // Try to ensure card number field is accessible
      const cardNumberFrame = this.page.frameLocator('iframe[title*="card number"], iframe[title*="Secure card number"]')
      const cardInput = cardNumberFrame.locator('input[name="cardnumber"]')

      try {
        await cardInput.waitFor({ timeout: 5000 })
        console.log('✅ Card number field is ready')
      } catch (e) {
        console.log('⚠️  Card number field not immediately accessible, will retry during interaction')
      }

      return true
    } catch (error) {
      console.error(`❌ Stripe Elements not ready: ${error.message}`)
      return false
    }
  }

  /**
   * Fill Stripe Elements form with robust iframe handling
   */
  async fillStripeElementsForm(cardData) {
    console.log(`🔧 Filling Stripe Elements with ${cardData.description || 'test'} card`)

    try {
      // Ensure Stripe Elements are ready
      const ready = await this.waitForStripeElementsReady()
      if (!ready) {
        throw new Error('Stripe Elements not ready for interaction')
      }

      // Deterministic single-path fill using selectors.json
      await this.fillCardNumber(cardData.number)
      await this.fillExpiryDate(cardData.expiryDate)
      await this.fillCVC(cardData.cvc)
      await this.fillCardholderName(cardData.name)

      console.log('✅ Stripe Elements form filled successfully')
      return true

    } catch (error) {
      console.error(`❌ Error filling Stripe Elements: ${error.message}`)
      throw error
    }
  }

  /**
   * Fill card number with multiple fallback approaches
   */
  async fillCardNumberRobust(cardNumber) {
    console.log('🔧 Filling card number (robust method deprecated)')
    await this.fillCardNumber(cardNumber)
  }

  /**
   * Fill expiry date with multiple fallback approaches
   */
  async fillExpiryDateRobust(expiryDate) {
    console.log('🔧 Filling expiry date (robust method deprecated)')
    await this.fillExpiryDate(expiryDate)
  }

  /**
   * Fill CVC with multiple fallback approaches
   */
  async fillCvcRobust(cvc) {
    console.log('🔧 Filling CVC (robust method deprecated)')
    await this.fillCVC(cvc)
  }

  /**
   * Fill cardholder name (usually on main page, not in iframe)
   */
  async fillCardholderNameRobust(name) {
    console.log('🔧 Filling cardholder name (robust method deprecated)')
    await this.fillCardholderName(name)
  }

  /**
   * Wait for payment processing to complete
   */
  async waitForPaymentSuccess(timeoutMs = 30000) {
    console.log('⏳ Waiting for payment processing...')

    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      // Check if we're redirected back to our app
      const currentUrl = this.page.url()

      if (currentUrl.includes(this.baseURL) && !currentUrl.includes('stripe.com')) {
        console.log('✅ Redirected back to application - payment likely successful')
        return true
      }

      // Check for success indicators on Stripe page
      const successIndicators = [
        'text="Payment successful"',
        'text="Your payment was successful"',
        'text="Thank you"',
        '[data-testid="payment-success"]'
      ]

      for (const indicator of successIndicators) {
        try {
          const element = this.page.locator(indicator)
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`✅ Payment success indicator found: ${indicator}`)
            return true
          }
        } catch (e) {
          // Continue checking
        }
      }

      // Check for error indicators
      const errorIndicators = [
        'text="Your card was declined"',
        'text="Payment failed"',
        'text="There was an error"',
        '[role="alert"]'
      ]

      for (const indicator of errorIndicators) {
        try {
          const element = this.page.locator(indicator)
          if (await element.isVisible({ timeout: 1000 })) {
            const errorText = await element.textContent()
            throw new Error(`Payment failed: ${errorText}`)
          }
        } catch (e) {
          if (e.message.includes('Payment failed')) {
            throw e
          }
          // Continue checking
        }
      }

      // Wait before next check
      await this.page.waitForTimeout(2000)
    }

    throw new Error(`Payment processing timeout after ${timeoutMs}ms`)
  }

  /**
   * Complete Stripe checkout flow with robust error handling
   */
  async completeStripeCheckout(cardData) {
    console.log('🔧 Starting complete Stripe checkout flow...')

    try {
      // Fill the form
      await this.fillStripeElementsForm(cardData)

      // Submit the form
      console.log('🔧 Submitting Stripe checkout form...')
      const submitButton = await this.findSubmitButton()
      await submitButton.click()

      // Handle 3D Secure if required
      const requires3DS = await this.handle3DSecure(true)
      if (requires3DS) {
        console.log('✅ 3D Secure authentication completed')
      }

      // Wait for payment success
      const success = await this.waitForPaymentSuccess()
      if (success) {
        console.log('✅ Stripe checkout completed successfully')
        return true
      }

      return false

    } catch (error) {
      console.error(`❌ Stripe checkout failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Find submit button with multiple approaches
   */
  async findSubmitButton() {
    const submitSelectors = Selectors.get('stripe', 'submitButton')

    for (const selector of submitSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible({ timeout: 3000 })) {
          console.log(`✅ Found submit button: ${selector}`)
          return button
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    throw new Error('Submit button not found')
  }
}
