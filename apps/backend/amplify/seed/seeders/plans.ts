import { createAmplifyClient } from '../utils/amplify'
import { ensureStripeSecret, createStripeClient, fetchStripeProductsWithPrices, centsToDecimal, type StripeProductWithPrices } from '../utils/stripe'

function parseFeatures(featuresString?: string): string[] {
  if (!featuresString) return [];
  return featuresString.split('|').map(feature => feature.trim());
}

function extractPlanMetadata(product: import('stripe').Stripe.Product) {
  const metadata = product.metadata || {};

  return {
    appPlanId: metadata.app_plan_id || product.id,
    monthlyPriceAmount: parseFloat(metadata.monthly_price || '0'),
    yearlyPriceAmount: parseFloat(metadata.yearly_price || '0'),
    currency: metadata.currency || 'usd',
    features: parseFeatures(metadata.features),
  };
}

async function upsertSubscriptionPlan(client: any, planData: StripeProductWithPrices): Promise<void> {
  const { product, monthlyPrice, yearlyPrice } = planData;
  const metadata = extractPlanMetadata(product);

  const subscriptionPlan = {
    planId: metadata.appPlanId,
    name: product.name,
    description: product.description || '',
    monthlyPrice: monthlyPrice ? centsToDecimal(monthlyPrice.unit_amount!) : metadata.monthlyPriceAmount / 100,
    yearlyPrice: yearlyPrice ? centsToDecimal(yearlyPrice.unit_amount!) : metadata.yearlyPriceAmount / 100,
    priceCurrency: metadata.currency.toUpperCase(),
    stripeMonthlyPriceId: monthlyPrice?.id,
    stripeYearlyPriceId: yearlyPrice?.id,
    stripeProductId: product.id,
    isActive: product.active,
  };

  try {
    // Check if plan exists using list with filter
    const { data: existing } = await client.models.SubscriptionPlan.list({
      filter: { planId: { eq: subscriptionPlan.planId } }
    });

    if (existing && existing.length > 0) {
      // Update existing plan
      console.log(`🔄 Updating plan: ${subscriptionPlan.name} (${subscriptionPlan.planId})`);
      await client.models.SubscriptionPlan.update(subscriptionPlan);
    } else {
      // Create new plan
      console.log(`➕ Creating plan: ${subscriptionPlan.name} (${subscriptionPlan.planId})`);
      await client.models.SubscriptionPlan.create(subscriptionPlan);
    }

    console.log(`✅ Successfully synced: ${subscriptionPlan.name}`);
  } catch (error) {
    console.error(`❌ Error syncing plan ${subscriptionPlan.planId}:`, error);
    throw error;
  }
}

export async function syncPlansFromStripe(): Promise<void> {
  console.log('🔄 Syncing plans from Stripe API to DynamoDB...');

  const stripeSecret = await ensureStripeSecret();
  const stripe = createStripeClient(stripeSecret);

  // Fetch products and prices from Stripe
  const productsWithPrices = await fetchStripeProductsWithPrices(stripe);

  if (productsWithPrices.length === 0) {
    console.log('⚠️  No active products found in Stripe');
    return;
  }

  // Create Amplify client
  const client = createAmplifyClient();

  console.log(`📋 Syncing ${productsWithPrices.length} products to DynamoDB...`);

  for (const productData of productsWithPrices) {
    await upsertSubscriptionPlan(client, productData);
  }

  console.log('✅ Plans synced from Stripe API successfully!');
}
