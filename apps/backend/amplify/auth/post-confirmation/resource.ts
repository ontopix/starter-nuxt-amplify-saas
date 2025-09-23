import { defineFunction, secret } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY')
  }
})
