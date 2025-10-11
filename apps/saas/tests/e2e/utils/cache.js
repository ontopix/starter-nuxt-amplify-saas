import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CACHE_DIR = path.join(__dirname, '..', '.cache')

export class TestCache {
  static ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
  }

  static set(key, value) {
    this.ensureCacheDir()
    const filePath = path.join(CACHE_DIR, `${key}.json`)
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
  }

  static get(key) {
    const filePath = path.join(CACHE_DIR, `${key}.json`)
    if (!fs.existsSync(filePath)) {
      return null
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.warn(`Failed to read cache key: ${key}`, error.message)
      return null
    }
  }

  static clear(key = null) {
    if (key) {
      const filePath = path.join(CACHE_DIR, `${key}.json`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } else {
      // Clear all cache
      if (fs.existsSync(CACHE_DIR)) {
        fs.rmSync(CACHE_DIR, { recursive: true, force: true })
      }
    }
  }
}
