import * as Auth from 'aws-amplify/auth'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { generateClient } from 'aws-amplify/data'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'

// configure the Amplify client library
if (import.meta.client) {
  Amplify.configure(outputs, { ssr: true })
}

// generate your data client using the Schema from your backend
const client = generateClient<Schema>({
  authMode: 'userPool'
})

export default defineNuxtPlugin({
  name: 'AmplifyAPIs',
  enforce: 'pre',
  setup() {
    return {
      provide: {
        Amplify: {
          Auth,
          GraphQL: {
            client
          },
          Storage: {
            uploadData,
            getUrl
          }
        }
      }
    }
  }
})
