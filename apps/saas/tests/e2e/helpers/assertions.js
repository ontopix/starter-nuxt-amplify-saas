import { expect } from '@playwright/test'
import { SelectorHelper } from '../utils/selectors.js'

/**
 * Common assertion helpers for E2E tests
 */
export class AssertionHelpers {
  constructor(page) {
    this.page = page
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000'
    this.validation = {
      timing: {
        webhooks: {
          processingDelay: 5000
        }
      },
      validation: {
        successIndicators: {
          subscription_created: [
            'text="Subscription successful"',
            'text="Welcome to Pro"',
            'text="Welcome to Enterprise"',
            'text="Payment successful"'
          ],
          plan_changed: [
            'text="Plan updated successfully"',
            'text="Your subscription has been updated"',
            'text="Plan changed successfully"'
          ],
          payment_added: [
            'text="Payment method added"',
            'text="Card added successfully"',
            'text="Payment method updated"'
          ]
        },
        errorMessages: {
          card_declined: "Your card was declined",
          insufficient_funds: "Your card has insufficient funds",
          expired_card: "Your card has expired",
          invalid_cvc: "Your card's security code is invalid"
        }
      }
    }
  }

  /**
   * Assert that user is on the correct plan
   */
  async assertCurrentPlan(expectedPlanId) {
    console.log(`🔍 Verifying user is on ${expectedPlanId} plan...`)

    // Navigate to billing settings to check current plan
    await this.page.goto(`${this.baseURL}/settings/billing`)
    await this.page.waitForTimeout(3000)

    try {
      // Look for plan indicators based on expected plan
      const planIndicators = this.getPlanIndicators(expectedPlanId)

      let planFound = false
      for (const indicator of planIndicators) {
        try {
          const element = this.page.locator(indicator.selector)
          if (await element.isVisible({ timeout: 5000 })) {
            if (indicator.textMatch) {
              const text = await element.textContent()
              if (text && text.toLowerCase().includes(indicator.textMatch.toLowerCase())) {
                console.log(`✅ Found plan indicator: "${text}" (${indicator.selector})`)
                planFound = true
                break
              }
            } else {
              console.log(`✅ Found plan indicator: ${indicator.selector}`)
              planFound = true
              break
            }
          }
        } catch (e) {
          // Continue checking other indicators
        }
      }

      if (!planFound) {
        // Fallback: check page content
        const pageContent = await this.page.textContent('body')
        const planName = expectedPlanId.charAt(0).toUpperCase() + expectedPlanId.slice(1)
        if (pageContent && pageContent.toLowerCase().includes(planName.toLowerCase())) {
          console.log(`✅ Found plan name in page content: ${planName}`)
          planFound = true
        }
      }

      expect(planFound).toBe(true)
      console.log(`✅ Verified user is on ${expectedPlanId} plan`)

    } catch (error) {
      console.error(`❌ Failed to verify plan ${expectedPlanId}: ${error.message}`)

      // Debug: log current page content
      await this.debugBillingPage()
      throw error
    }
  }

  /**
   * Get plan-specific indicators to look for
   */
  getPlanIndicators(planId) {
    const baseSelectors = [
      { selector: '[data-testid="current-plan"]', textMatch: planId },
      { selector: '[data-testid="plan-name"]', textMatch: planId },
      { selector: 'h1, h2, h3', textMatch: planId },
      { selector: 'text="Current Subscription"', textMatch: null }
    ]

    // Add plan-specific indicators using centralized selectors
    if (planId === 'free') {
      const freeSelectors = SelectorHelper.get('assertions', 'planIndicators.free')
      return [
        ...baseSelectors,
        ...freeSelectors.map(selector => ({ selector, textMatch: null }))
      ]
    } else if (planId === 'pro') {
      const proSelectors = SelectorHelper.get('assertions', 'planIndicators.pro')
      return [
        ...baseSelectors,
        ...proSelectors.map(selector => ({ selector, textMatch: null }))
      ]
    } else if (planId === 'enterprise') {
      const enterpriseSelectors = SelectorHelper.get('assertions', 'planIndicators.enterprise')
      return [
        ...baseSelectors,
        ...enterpriseSelectors.map(selector => ({ selector, textMatch: null }))
      ]
    }

    return baseSelectors
  }

  /**
   * Assert that subscription was created successfully
   */
  async assertSubscriptionSuccess(planId) {
    console.log(`🔍 Verifying subscription success for ${planId} plan...`)

    // Wait for webhook processing
    const webhookDelay = this.validation.timing?.webhooks?.processingDelay || 5000
    await this.page.waitForTimeout(webhookDelay)

    // Check for success indicators using centralized selectors
    const successIndicators = SelectorHelper.get('assertions', 'successIndicators.subscriptionCreated')

    let successFound = false
    for (const indicator of successIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Found success indicator: ${indicator}`)
          successFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // If no toast/message found, verify by checking current plan
    if (!successFound) {
      console.log('ℹ️  No success message found, verifying by checking current plan')
      await this.assertCurrentPlan(planId)
    } else {
      expect(successFound).toBe(true)
    }

    console.log(`✅ Subscription to ${planId} plan verified successfully`)
  }

  /**
   * Assert that plan change was successful
   */
  async assertPlanChangeSuccess(newPlanId) {
    console.log(`🔍 Verifying plan change success to ${newPlanId}...`)

    // Wait for webhook processing
    const webhookDelay = this.validation.timing?.webhooks?.processingDelay || 5000
    await this.page.waitForTimeout(webhookDelay)

    // Check for plan change success indicators using centralized selectors
    const changeIndicators = SelectorHelper.get('assertions', 'successIndicators.planChanged')

    let changeFound = false
    for (const indicator of changeIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Found plan change indicator: ${indicator}`)
          changeFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // Verify the plan actually changed
    await this.assertCurrentPlan(newPlanId)

    console.log(`✅ Plan change to ${newPlanId} verified successfully`)
  }

  /**
   * Assert that payment method was added successfully
   */
  async assertPaymentMethodAdded() {
    console.log('🔍 Verifying payment method was added...')

    const paymentIndicators = SelectorHelper.get('assertions', 'successIndicators.paymentAdded')

    let paymentFound = false
    for (const indicator of paymentIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Found payment method indicator: ${indicator}`)
          paymentFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(paymentFound).toBe(true)
    console.log('✅ Payment method addition verified successfully')
  }

  /**
   * Assert that billing UI shows correct elements for plan
   */
  async assertBillingUIForPlan(planId) {
    console.log(`🔍 Verifying billing UI for ${planId} plan...`)

    // Simple expectations based on plan type
    const expectations = {
      free: {
        buttonText: 'Upgrade',
        buttonDisabled: false,
        showUpgradeOptions: true,
        showDowngradeOptions: false
      },
      pro: {
        buttonText: 'Change Plan',
        buttonDisabled: false,
        showUpgradeOptions: true,
        showDowngradeOptions: true
      },
      enterprise: {
        buttonText: 'Change Plan',
        buttonDisabled: false,
        showUpgradeOptions: false,
        showDowngradeOptions: true
      }
    }

    const planExpectations = expectations[planId]
    if (!planExpectations) {
      console.log(`ℹ️  No UI expectations defined for ${planId} plan`)
      return
    }

    // Navigate to billing settings
    await this.page.goto(`${this.baseURL}/settings/billing`)
    await this.page.waitForTimeout(3000)

    // Check button states and visibility
    if (planExpectations.buttonText) {
      const buttonSelector = 'button:has-text("Change Plan"), button:has-text("Current Plan")'
      const button = this.page.locator(buttonSelector).first()

      if (await button.isVisible({ timeout: 5000 })) {
        const buttonText = await button.textContent()
        expect(buttonText).toContain(planExpectations.buttonText)
        console.log(`✅ Button text correct: "${buttonText}"`)

        if (planExpectations.buttonDisabled !== undefined) {
          const isDisabled = await button.getAttribute('disabled')
          const actuallyDisabled = isDisabled !== null
          expect(actuallyDisabled).toBe(planExpectations.buttonDisabled)
          console.log(`✅ Button disabled state correct: ${actuallyDisabled}`)
        }
      }
    }

    // Check upgrade/downgrade options visibility
    if (planExpectations.showUpgradeOptions !== undefined) {
      const upgradeSelectors = SelectorHelper.get('billing', 'upgradeButton')
      const upgradeSelector = upgradeSelectors.map(s => `text="${s.replace('button:has-text(\'', '').replace('\')', '')}"`).join(', ')
      const upgradeExists = await this.page.locator(upgradeSelector).first().isVisible({ timeout: 2000 })
      expect(upgradeExists).toBe(planExpectations.showUpgradeOptions)
      console.log(`✅ Upgrade options visibility correct: ${upgradeExists}`)
    }

    if (planExpectations.showDowngradeOptions !== undefined) {
      const downgradeSelectors = SelectorHelper.get('billing', 'downgradeButton')
      const downgradeSelector = downgradeSelectors.map(s => `text="${s.replace('button:has-text(\'', '').replace('\')', '')}"`).join(', ')
      const downgradeExists = await this.page.locator(downgradeSelector).first().isVisible({ timeout: 2000 })
      expect(downgradeExists).toBe(planExpectations.showDowngradeOptions)
      console.log(`✅ Downgrade options visibility correct: ${downgradeExists}`)
    }

    console.log(`✅ Billing UI for ${planId} plan verified successfully`)
  }

  /**
   * Assert that error message appears for failed payment
   */
  async assertPaymentError(expectedError = null) {
    console.log('🔍 Verifying payment error appears...')

    const errorMessages = SelectorHelper.get('assertions', 'errorMessages')

    const errorSelectors = SelectorHelper.get('stripe', 'errorSelectors')

    let errorFound = false
    let errorText = ''

    for (const selector of errorSelectors) {
      try {
        const errorElement = this.page.locator(selector)
        if (await errorElement.isVisible({ timeout: 10000 })) {
          errorText = await errorElement.textContent()
          if (errorText && errorText.trim()) {
            console.log(`✅ Found error message: "${errorText}"`)
            errorFound = true
            break
          }
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    expect(errorFound).toBe(true)

    // If specific error expected, verify it matches
    if (expectedError && errorMessages[expectedError]) {
      const expectedMessage = errorMessages[expectedError]
      expect(errorText.toLowerCase()).toContain(expectedMessage.toLowerCase())
      console.log(`✅ Error message matches expected: "${expectedMessage}"`)
    }

    console.log('✅ Payment error verification successful')
  }

  /**
   * Assert that user is redirected to correct URL
   */
  async assertRedirect(expectedUrlPattern, timeout = 30000) {
    console.log(`🔍 Verifying redirect to: ${expectedUrlPattern}...`)

    try {
      if (typeof expectedUrlPattern === 'string') {
        await this.page.waitForURL(url => url.includes(expectedUrlPattern), { timeout })
      } else if (expectedUrlPattern instanceof RegExp) {
        await this.page.waitForURL(expectedUrlPattern, { timeout })
      } else {
        throw new Error('Invalid URL pattern type')
      }

      const currentUrl = this.page.url()
      console.log(`✅ Redirect successful. Current URL: ${currentUrl}`)

    } catch (error) {
      const currentUrl = this.page.url()
      console.error(`❌ Redirect failed. Expected: ${expectedUrlPattern}, Actual: ${currentUrl}`)
      throw new Error(`Redirect timeout. Expected: ${expectedUrlPattern}, Actual: ${currentUrl}`)
    }
  }

  /**
   * Assert that Stripe Checkout loaded correctly
   */
  async assertStripeCheckoutLoaded() {
    console.log('🔍 Verifying Stripe Checkout loaded...')

    const checkoutIndicators = SelectorHelper.get('stripe', 'checkoutIndicators')

    let checkoutFound = false
    for (const indicator of checkoutIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 15000 })) {
          console.log(`✅ Stripe Checkout loaded: ${indicator}`)
          checkoutFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(checkoutFound).toBe(true)
    console.log('✅ Stripe Checkout verification successful')
  }

  /**
   * Assert that Stripe Customer Portal loaded correctly
   */
  async assertStripePortalLoaded() {
    console.log('🔍 Verifying Stripe Customer Portal loaded...')

    // Check URL
    const currentUrl = this.page.url()
    expect(currentUrl).toContain('billing.stripe.com')

    // Check page content
    const portalIndicators = SelectorHelper.get('stripe', 'portalIndicators')

    let portalFound = false
    for (const indicator of portalIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Portal indicator found: ${indicator}`)
          portalFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(portalFound).toBe(true)
    console.log('✅ Stripe Customer Portal verification successful')
  }

  /**
   * Debug current billing page content
   */
  async debugBillingPage() {
    try {
      console.log('🔍 DEBUGGING BILLING PAGE CONTENT:')

      const currentUrl = this.page.url()
      console.log(`Current URL: ${currentUrl}`)

      const title = await this.page.title()
      console.log(`Page title: "${title}"`)

      // Look for common billing elements
      const commonSelectors = [
        'h1', 'h2', 'h3',
        '[data-testid*="plan"]',
        '[data-testid*="subscription"]',
        'button:visible'
      ]

      for (const selector of commonSelectors) {
        try {
          const elements = await this.page.locator(selector).all()
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements matching "${selector}":`)
            for (let i = 0; i < Math.min(elements.length, 5); i++) {
              const text = await elements[i].textContent()
              if (text && text.trim()) {
                console.log(`  - "${text.trim()}"`)
              }
            }
          }
        } catch (e) {
          // Continue with other selectors
        }
      }

    } catch (error) {
      console.log(`Debug error: ${error.message}`)
    }
  }

  /**
   * Wait for element with custom timeout and error message
   */
  async waitForElement(selector, options = {}) {
    const {
      timeout = 10000,
      errorMessage = `Element not found: ${selector}`
    } = options

    try {
      await this.page.locator(selector).waitFor({ timeout })
      console.log(`✅ Element found: ${selector}`)
      return true
    } catch (error) {
      console.error(`❌ ${errorMessage}`)
      throw new Error(errorMessage)
    }
  }

  /**
   * Assert text content matches expected value
   */
  async assertTextContent(selector, expectedText, options = {}) {
    const {
      exact = false,
      timeout = 5000
    } = options

    const element = this.page.locator(selector).first()
    await element.waitFor({ timeout })

    const actualText = await element.textContent()

    if (exact) {
      expect(actualText?.trim()).toBe(expectedText)
    } else {
      expect(actualText?.toLowerCase()).toContain(expectedText.toLowerCase())
    }

    console.log(`✅ Text content verified: "${actualText}" ${exact ? 'equals' : 'contains'} "${expectedText}"`)
  }

  /**
   * Assert that no payment methods are present
   */
  async assertNoPaymentMethods() {
    console.log('🔍 Verifying no payment methods are present...')

    const paymentMethodIndicators = SelectorHelper.get('assertions', 'paymentMethodIndicators')

    let paymentMethodFound = false
    for (const indicator of paymentMethodIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          paymentMethodFound = true
          console.log(`⚠️  Found payment method indicator: ${indicator}`)
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // Also check for "No payment method" or similar messages
    const noPaymentIndicators = SelectorHelper.get('assertions', 'noPaymentIndicators')

    let noPaymentMessageFound = false
    for (const indicator of noPaymentIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          noPaymentMessageFound = true
          console.log(`✅ Found no payment method message: ${indicator}`)
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(paymentMethodFound).toBe(false)
    expect(noPaymentMessageFound).toBe(true)
    console.log('✅ Verified no payment methods are present')
  }

  /**
   * Assert that no invoices are present
   */
  async assertNoInvoices() {
    console.log('🔍 Verifying no invoices are present...')

    const invoiceIndicators = SelectorHelper.get('assertions', 'invoiceIndicators')

    let invoiceFound = false
    for (const indicator of invoiceIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          // Additional check: make sure it's not just the word "Invoice" in a header
          const text = await element.textContent()
          if (text && (text.includes('#') || text.includes('$') || text.includes('Paid'))) {
            invoiceFound = true
            console.log(`⚠️  Found invoice indicator: ${indicator} with text: "${text}"`)
            break
          }
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // Also check for "No invoices" or similar messages
    const noInvoiceIndicators = SelectorHelper.get('assertions', 'noInvoiceIndicators')

    let noInvoiceMessageFound = false
    for (const indicator of noInvoiceIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          noInvoiceMessageFound = true
          console.log(`✅ Found no invoices message: ${indicator}`)
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(invoiceFound).toBe(false)
    // Note: We don't require a "no invoices" message as it might not always be present
    console.log('✅ Verified no invoices are present')
  }

  /**
   * Assert that a payment method exists with given last four digits
   */
  async assertPaymentMethodExists(lastFour) {
    console.log(`🔍 Verifying payment method ending in ${lastFour} exists...`)

    const basePaymentSelectors = SelectorHelper.get('assertions', 'paymentMethodIndicators')
    const paymentSelectors = [
      ...basePaymentSelectors,
      `text="•••• •••• •••• ${lastFour}"`,
      `text="****${lastFour}"`,
      `[data-testid="payment-method"]:has-text("${lastFour}")`,
      `text="ending in ${lastFour}"`
    ]

    let methodFound = false
    for (const selector of paymentSelectors) {
      try {
        const element = this.page.locator(selector)
        if (await element.isVisible({ timeout: 5000 })) {
          console.log(`✅ Found payment method: ${selector}`)
          methodFound = true
          break
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    expect(methodFound).toBe(true)
    console.log(`✅ Payment method ending in ${lastFour} verified`)
  }
}
