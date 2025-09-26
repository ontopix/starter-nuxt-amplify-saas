import { a } from '@aws-amplify/backend'
import { subscriptionModel, invoiceModel } from './schemas'

// Create a schema that includes all billing-related models
export const billingSchema = a.schema({
  Subscription: subscriptionModel,
  Invoice: invoiceModel,
})

// Export individual models for potential use elsewhere
export { subscriptionModel, invoiceModel }