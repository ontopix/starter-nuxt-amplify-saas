import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-confirmation";
import Stripe from 'stripe';

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
  const firstName = userAttributes.given_name || '';
  const lastName = userAttributes.family_name || '';
  const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';

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


    // Create UserProfile with only Stripe customer ID, no plan assigned
    await client.models.UserProfile.create({
      userId: userId,
      stripeCustomerId: stripeCustomer.id,
      stripeProductId: null,
      stripePriceId: null
    });
    console.log(`UserProfile created for user: ${userId}`);

  } catch (error) {
    console.error('Error in post-confirmation handler:', error);
    // Don't throw error to prevent user registration from failing
    // Just log the error and continue
  }

  return event;
};
