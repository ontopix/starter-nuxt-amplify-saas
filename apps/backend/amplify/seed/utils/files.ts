import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export async function loadJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.resolve(process.cwd(), relativePath)
  const content = await readFile(filePath, { encoding: 'utf8' })
  return JSON.parse(content) as T
}

export function fileExists(relativePath: string): boolean {
  const filePath = path.resolve(process.cwd(), relativePath)
  return existsSync(filePath)
}
