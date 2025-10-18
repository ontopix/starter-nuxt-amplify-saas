import Stripe from 'stripe'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession } from 'aws-amplify/auth/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  return await withAmplifyAuth(event, async (contextSpec) => {
    // Get user ID from auth session
    const session = await fetchAuthSession(contextSpec)
    const userId = session.tokens?.idToken?.payload?.sub

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User ID not found in session'
      })
    }

    const client = getServerUserPoolDataClient()
    const { data: userSubscription } = await client.models.UserSubscription.get(
      contextSpec,
      { userId },
      {
        selectionSet: [
          'userId', 'planId', 'stripeSubscriptionId', 'stripeCustomerId',
          'status', 'currentPeriodStart', 'currentPeriodEnd', 'cancelAtPeriodEnd',
          'billingInterval', 'trialStart', 'trialEnd',
          'subscriptionPlan.planId', 'subscriptionPlan.name', 'subscriptionPlan.description',
          'subscriptionPlan.monthlyPrice', 'subscriptionPlan.yearlyPrice', 'subscriptionPlan.priceCurrency'
        ]
      }
    )

    if (!userSubscription) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No subscription found for user'
      })
    }

    // Get payment method from Stripe if user has a Stripe customer ID
    let paymentMethod = null
    if (userSubscription.stripeCustomerId) {
      try {
        // Get customer's default payment method (modern) — avoid legacy default_source
        const customer = await stripe.customers.retrieve(userSubscription.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        })

        if (customer && !customer.deleted) {
          let paymentMethodData = null

          // Prefer modern default payment method
          const defaultPaymentMethod = customer.invoice_settings?.default_payment_method
          if (defaultPaymentMethod && typeof defaultPaymentMethod === 'object') {
            paymentMethodData = defaultPaymentMethod
          } else {
            // Fallback: any attached card-type payment methods
            const paymentMethods = await stripe.paymentMethods.list({
              customer: userSubscription.stripeCustomerId,
              type: 'card',
              limit: 10
            })

            if (paymentMethods.data.length > 0) {
              paymentMethodData = paymentMethods.data[0]
            }
          }

          // Extract payment method details
          if (paymentMethodData?.card) {
            paymentMethod = {
              type: 'card',
              brand: paymentMethodData.card.brand,
              last4: paymentMethodData.card.last4,
              expMonth: paymentMethodData.card.exp_month,
              expYear: paymentMethodData.card.exp_year
            }
          }
        }
      } catch (stripeError) {
        console.error('Could not fetch payment method from Stripe:', stripeError)
        // Continue without payment method - not critical
      }
    }

    // Get plan features
    const planFeatures = []

    return {
      success: true,
      data: {
        subscription: {
          planId: userSubscription.planId,
          status: userSubscription.status,
          currentPeriodStart: userSubscription.currentPeriodStart,
          currentPeriodEnd: userSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: userSubscription.cancelAtPeriodEnd,
          billingInterval: userSubscription.billingInterval,
          trialStart: userSubscription.trialStart,
          trialEnd: userSubscription.trialEnd,
          stripeSubscriptionId: userSubscription.stripeSubscriptionId,
          stripeCustomerId: userSubscription.stripeCustomerId
        },
        plan: {
          id: userSubscription.subscriptionPlan?.planId || userSubscription.planId,
          name: userSubscription.subscriptionPlan?.name || 'Unknown Plan',
          description: userSubscription.subscriptionPlan?.description,
          monthlyPrice: userSubscription.subscriptionPlan?.monthlyPrice || 0,
          yearlyPrice: userSubscription.subscriptionPlan?.yearlyPrice || 0,
          currency: userSubscription.subscriptionPlan?.priceCurrency || 'USD',
          features: planFeatures,
          // For backward compatibility with current components
          price: userSubscription.billingInterval === 'year'
            ? Math.round((userSubscription.subscriptionPlan?.yearlyPrice || 0) / 12)
            : userSubscription.subscriptionPlan?.monthlyPrice || 0,
          interval: userSubscription.billingInterval === 'year' ? 'year' : 'month'
        },
        paymentMethod
      }
    }
  })
})
