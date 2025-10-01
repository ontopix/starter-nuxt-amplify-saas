import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";

const userProfileModel = a.model({
  userId: a.string().required(),
  stripeCustomerId: a.string(),
  stripeProductId: a.string(),
  stripePriceId: a.string(),
}).identifier(['userId'])

const schema = a
  .schema({
    UserProfile: userProfileModel
      .authorization((allow) => [
        allow.publicApiKey(),
        allow.ownerDefinedIn("userId").to(["read"]),
      ]),
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
