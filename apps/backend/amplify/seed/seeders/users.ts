import * as auth from 'aws-amplify/auth'
import { createAndSignUpUser, signInUser, addToUserGroup } from '@aws-amplify/seed'
import { createAmplifyClient } from '../utils/amplify'

export type SeedUser = {
  username: string
  password: string
  attributes?: Record<string, string>
  groups?: string[]
  planId?: string
  billingInterval?: 'month' | 'year'
}

export type SeedUsersFile = { users: SeedUser[] }

async function createUserSubscription(client: any, userId: string, planId: string, billingInterval: 'month' | 'year'): Promise<void> {
  try {
    // Verify the plan exists
    const { data: plans } = await client.models.SubscriptionPlan.list({
      filter: { planId: { eq: planId } }
    });

    if (!plans || plans.length === 0) {
      console.warn(`⚠️  Plan ${planId} not found, skipping subscription creation for user ${userId}`);
      return;
    }

    const plan = plans[0];
    const now = new Date();
    const periodEnd = new Date(now);

    // Set period end based on billing interval
    if (billingInterval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const subscription = {
      userId,
      planId,
      stripeCustomerId: `seed_${userId}_${Date.now()}`, // Mock customer ID for seed data
      status: 'active' as const,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      billingInterval,
    };

    await client.models.UserSubscription.create(subscription);
    console.log(`✅ Created subscription for user ${userId} on plan ${planId} (${billingInterval})`);
  } catch (error) {
    console.error(`❌ Error creating subscription for user ${userId}:`, error);
    // Don't throw - continue with next user
  }
}

async function seedUser(client: any, user: SeedUser): Promise<void> {
  try {
    // Create user in Cognito
    await createAndSignUpUser({
      username: user.username,
      password: user.password,
      signInAfterCreation: true,
      signInFlow: 'Password',
      userAttributes: user.attributes
    });
    console.log(`✅ Created user: ${user.username}`);
  } catch (err) {
    if ((err as Error).name === 'UsernameExistsError') {
      await signInUser({ username: user.username, password: user.password, signInFlow: 'Password' });
      console.log(`✅ Signed in existing user: ${user.username}`);
    } else {
      throw err;
    }
  }

  // Add groups if any
  if (user.groups && user.groups.length > 0) {
    for (const group of user.groups) {
      try {
        await addToUserGroup({ username: user.username }, group);
        console.log(`✅ Added user ${user.username} to group ${group}`);
      } catch (e) {
        console.warn(`⚠️  Could not add user ${user.username} to group ${group}:`, e);
        // Ignore if group does not exist in sandbox
      }
    }
  }

  // Create subscription if planId is specified
  if (user.planId && user.billingInterval) {
    // Wait a bit for UserProfile to be created by post-confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    await createUserSubscription(client, user.username, user.planId, user.billingInterval);
  }

  try {
    await auth.signOut();
  } catch {
    // Ignore signOut failures when Auth isn't fully configured
  }
}

export async function seedUsers(usersFile: SeedUsersFile): Promise<void> {
  const client = createAmplifyClient();

  console.log(`👥 Seeding ${usersFile.users.length} users...`);

  for (const user of usersFile.users) {
    try {
      await seedUser(client, user);
    } catch (error) {
      console.error(`❌ Failed to seed user ${user.username}:`, error);
      // Continue with next user
    }
  }

  console.log('✅ Users seeded successfully');
}
