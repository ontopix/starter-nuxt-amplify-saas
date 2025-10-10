import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../data/resource'
import { readFile } from 'node:fs/promises'

export async function loadAmplifyOutputs(): Promise<any> {
  // Try backend outputs first
  const candidates = [
    '../../amplify_outputs.json',  // apps/backend/amplify_outputs.json
    '../../../amplify_outputs.json',  // Root amplify_outputs.json
    '../../../../layers/amplify/amplify_outputs.json'  // Layers amplify_outputs.json
  ]

  for (const rel of candidates) {
    try {
      const url = new URL(rel, import.meta.url)
      const outputs = JSON.parse(await readFile(url, { encoding: 'utf8' }))
      Amplify.configure(outputs)
      return outputs
    } catch {
      // continue
    }
  }
  throw new Error('Unable to load Amplify outputs (amplify_outputs.json)')
}

export function createAmplifyClient() {
  return generateClient<Schema>({ authMode: 'apiKey' })
}
