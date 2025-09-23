import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-confirmation";
import { getFreePlan } from "@starter-nuxt-amplify-saas/billing/utils/billing";
import Stripe from 'stripe';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

// Initialize Stripe client
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userAttributes = event.request.userAttributes;
  const userId = userAttributes.sub;
  const email = userAttributes.email;
  const name = userAttributes['custom:display_name'];

  try {
    // Create Stripe customer
    console.log(`Creating Stripe customer for user: ${email}`);
    const stripeCustomer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId
      }
    });
    console.log(`Stripe customer created: ${stripeCustomer.id}`);

    // Create UserProfile with Stripe customer ID
    await client.models.UserProfile.create({
      id: userId,
      userId: userId,
      stripeCustomerId: stripeCustomer.id
    });
    console.log(`UserProfile created for user: ${userId}`);

    const freePlan = getFreePlan();
    console.log('Free plan loaded:', freePlan?.name);

  } catch (error) {
    console.error('Error in post-confirmation handler:', error);
    // Don't throw error to prevent user registration from failing
    // Just log the error and continue
  }

  return event;
};
