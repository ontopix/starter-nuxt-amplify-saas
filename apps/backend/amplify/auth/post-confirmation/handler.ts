import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { getFreePlan } from "@starter-nuxt-amplify-saas/billing/utils";
import Stripe from 'stripe';

// Handle dynamic module import for AWS Amplify build context
let env: any;
try {
  const envModule = await import("$amplify/env/post-confirmation");
  env = envModule.env;
} catch (error) {
  console.warn("Could not import $amplify/env/post-confirmation. This is expected during TypeScript compilation.");
  env = process.env; // Fallback to process.env during development
}

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

export const handler: PostConfirmationTriggerHandler = async (event) => {

  const userAttributes = event.request.userAttributes;
  const userId = userAttributes.sub;
  const email = userAttributes.email;
  const name = userAttributes['custom:display_name'];

  try {
    console.log(`Creating Stripe customer for user: ${email}`);
    const stripeCustomer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId
      }
    });
    console.log(`Stripe customer created: ${stripeCustomer.id}`);

    // Get free plan details
    const freePlan = getFreePlan();
    console.log('Free plan loaded:', freePlan?.name);

    // Create UserProfile with Stripe customer ID and free plan details
    await client.models.UserProfile.create({
      userId: userId,
      stripeCustomerId: stripeCustomer.id,
      stripeProductId: null, // Free plan doesn't have a Stripe product ID
      stripePriceId: freePlan?.stripePriceId || null
    });
    console.log(`UserProfile created for user: ${userId}`);

  } catch (error) {
    console.error('Error in post-confirmation handler:', error);
    // Don't throw error to prevent user registration from failing
    // Just log the error and continue
  }

  return event;
};
