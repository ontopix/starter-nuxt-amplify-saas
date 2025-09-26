import { a } from '@aws-amplify/backend'
import { userProfileModel } from './schemas'

// Create a schema that includes all auth-related models
export const authSchema = a.schema({
  UserProfile: userProfileModel,
})

// Export individual models for potential use elsewhere
export { userProfileModel }