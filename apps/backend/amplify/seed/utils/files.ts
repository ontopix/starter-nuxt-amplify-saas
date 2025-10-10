import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export async function loadJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), relativePath)
  const normalized = process.platform === 'win32' && filePath.startsWith('/') ? filePath.slice(1) : filePath
  const content = await readFile(normalized, { encoding: 'utf8' })
  return JSON.parse(content) as T
}

export function fileExists(relativePath: string): boolean {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), relativePath)
  const normalized = process.platform === 'win32' && filePath.startsWith('/') ? filePath.slice(1) : filePath
  return existsSync(normalized)
}
