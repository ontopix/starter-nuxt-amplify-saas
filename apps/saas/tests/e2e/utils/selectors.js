import selectorsConfig from '../config/selectors.json' assert { type: 'json' }

export class SelectorHelper {
  static get(category, name) {
    const selectors = selectorsConfig[category]?.[name]
    if (!selectors) {
      throw new Error(`Selectors not found: ${category}.${name}`)
    }
    return Array.isArray(selectors) ? selectors : [selectors]
  }

  static async findElement(page, category, name, options = {}) {
    const config = selectorsConfig[category]?.[name]
    if (!config) {
      throw new Error(`Selectors not found: ${category}.${name}`)
    }

    const timeout = options.timeout || 2000

    // If config has textPatterns and selectors (for messages like errors/success)
    if (config.textPatterns && config.selectors) {
      // Try text patterns first (more specific)
      for (const pattern of config.textPatterns) {
        try {
          const element = page.getByText(pattern, { exact: false })
          const count = await element.count()
          if (count > 0) {
            for (let i = 0; i < count; i++) {
              if (await element.nth(i).isVisible({ timeout: 500 })) {
                return element.nth(i)
              }
            }
          }
        } catch (e) {
          // Continue
        }
      }

      // Try selectors (containers like [role="alert"])
      for (const selector of config.selectors) {
        try {
          const element = page.locator(selector)
          if (await element.isVisible({ timeout: 500 })) {
            return element
          }
        } catch (e) {
          // Continue
        }
      }
    } else {
      // Standard selector list
      const selectors = Array.isArray(config) ? config : [config]
      for (const selector of selectors) {
        try {
          const element = page.locator(selector)
          if (await element.isVisible({ timeout: 500 })) {
            return element
          }
        } catch (e) {
          // Continue
        }
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
