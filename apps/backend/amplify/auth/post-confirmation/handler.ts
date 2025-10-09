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


    // Create UserProfile with Stripe customer ID
    await client.models.UserProfile.create({
      userId: userId,
      stripeCustomerId: stripeCustomer.id,
    });
    console.log(`UserProfile created for user: ${userId}`);

    // Create free subscription for the user
    await client.models.UserSubscription.create({
      userId: userId,
      planId: 'free',
      stripeSubscriptionId: null, // No actual Stripe subscription for free plan
      stripeCustomerId: stripeCustomer.id,
      status: 'active',
      currentPeriodStart: new Date().toISOString(), // When they started using the free plan
      currentPeriodEnd: null, // Free plan never expires
      cancelAtPeriodEnd: false,
      billingInterval: null, // No billing for free plan
      trialStart: null, // No trial needed for free plan
      trialEnd: null, // No trial needed for free plan
    });
    console.log(`Free subscription created for user: ${userId}`);

  } catch (error) {
    console.error('Error in post-confirmation handler:', error);
    // Don't throw error to prevent user registration from failing
    // Just log the error and continue
  }

  return event;
};
