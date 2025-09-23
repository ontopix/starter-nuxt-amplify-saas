import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  userAttributes: {
    'profilePicture': {
      mutable: true,
      required: false
    },
    'custom:display_name': {
      dataType: 'String',
      mutable: true,
      maxLen: 16,
      minLen: 1
    }
  },
  triggers: {
    postConfirmation
  }
})
