import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const selectorsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/selectors.json'), 'utf8'))

export class SelectorHelper {
  static get(category, name) {
    const selectors = selectorsConfig[category]?.[name]
    if (!selectors) {
      throw new Error(`Selectors not found: ${category}.${name}`)
    }
    return Array.isArray(selectors) ? selectors : [selectors]
  }

  static async findElement(page, category, name, options = {}) {
    const selectors = this.get(category, name)
    const timeout = options.timeout || 2000

    // Try each selector until one is found
    for (const selector of selectors) {
      try {
        const element = page.locator(selector)
        // Wait for element to be visible with a reasonable timeout
        await element.waitFor({ state: 'visible', timeout: 2000 })
        return element
      } catch (e) {
        // Continue to next selector
      }
    }

    throw new Error(`Element not found: ${category}.${name}`)
  }

  static async hasElement(page, category, name, options = {}) {
    try {
      await this.findElement(page, category, name, options)
      return true
    } catch (e) {
      return false
    }
  }
}
