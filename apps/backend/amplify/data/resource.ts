import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";
import { userProfileModel } from "@starter-nuxt-amplify-saas/auth/data/schemas";
import { subscriptionModel, invoiceModel } from "@starter-nuxt-amplify-saas/billing/data/schemas";

// Create a combined schema from all layer models using direct imports
const schema = a
  .schema({
    // Import models directly from layers
    UserProfile: userProfileModel,
    Subscription: subscriptionModel,
    Invoice: invoiceModel,
  })
  .authorization((allow) => [allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
