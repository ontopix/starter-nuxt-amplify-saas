import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Fixture file paths
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures')
const STRIPE_CARDS_FILE = path.join(FIXTURES_DIR, 'stripe-cards.json')

/**
 * Centralized data management for E2E tests
 */
export class DataManager {
  /**
   * Load and parse a fixture file
   */
  static loadFixture(filename) {
    try {
      const filePath = path.join(FIXTURES_DIR, filename)
      if (!fs.existsSync(filePath)) {
        console.warn(`Fixture file not found: ${filePath}`)
        return null
      }
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.error(`Error loading fixture ${filename}:`, error.message)
      return null
    }
  }

  /**
   * Save data to a fixture file
   */
  static saveFixture(filename, data) {
    try {
      const filePath = path.join(FIXTURES_DIR, filename)

      // Ensure fixtures directory exists
      if (!fs.existsSync(FIXTURES_DIR)) {
        fs.mkdirSync(FIXTURES_DIR, { recursive: true })
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`✓ Saved fixture: ${filename}`)
      return true
    } catch (error) {
      console.error(`Error saving fixture ${filename}:`, error.message)
      return false
    }
  }


  /**
   * Get Stripe test card data (simplified)
   */
  static getStripeCard(cardType = 'visa') {
    const cardsData = this.loadFixture('stripe-cards.json')
    if (!cardsData?.successCards?.[cardType]) {
      throw new Error(`Card type not found: ${cardType}`)
    }

    const card = cardsData.successCards[cardType]
    return {
      ...card,
      expiryDate: cardsData.testData.defaultExpiry,
      cvc: cardType === 'amex' ? cardsData.testData.amexCvc : cardsData.testData.defaultCvc,
      name: cardsData.testData.defaultName
    }
  }

  /**
   * Get seeded user from backend seed data
   */
  static getSeededUser(planType, index = 1) {
    const seededUsers = {
      free: [
        { email: 'test+free1@ontopix.ai', password: 'TestPassword123!', plan: 'free' },
        { email: 'test+free2@ontopix.ai', password: 'TestPassword123!', plan: 'free' }
      ],
      pro: [
        { email: 'test+pro1@ontopix.ai', password: 'TestPassword123!', plan: 'pro' },
        { email: 'test+pro2@ontopix.ai', password: 'TestPassword123!', plan: 'pro' }
      ],
      enterprise: [
        { email: 'test+enterprise1@ontopix.ai', password: 'TestPassword123!', plan: 'enterprise' },
        { email: 'test+enterprise2@ontopix.ai', password: 'TestPassword123!', plan: 'enterprise' }
      ]
    }

    const users = seededUsers[planType]
    if (!users) {
      throw new Error(`No seeded users for plan: ${planType}`)
    }

    const userIndex = Math.min(index - 1, users.length - 1)
    return users[userIndex]
  }

}
