export interface DashboardMenuItem {
  label: string
  icon?: string
  to?: string
  badge?: string
  children?: DashboardMenuItem[]
  type?: 'trigger'
  target?: '_blank'
  exact?: boolean
  defaultOpen?: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  stripePriceId: string
  features: string[]
  popular?: boolean
  limits: {
    projects?: number
    users?: number
    storage?: string
    apiRequests?: number
  }
}

export interface BillingConfig {
  plans: SubscriptionPlan[]
}

export interface DashboardConfig {
  navigation: {
    main: DashboardMenuItem[][]
  }
}

import billingPlans from '@starter-nuxt-amplify-saas/billing/billing-plans.json'

export default defineAppConfig({
  billing: {
    plans: billingPlans
  },
  dashboard: {
    navigation: {
      main: [[{
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/'
      }, {
        label: 'Inbox',
        icon: 'i-lucide-inbox',
        to: '/inbox',
        badge: '4'
      }, {
        label: 'Customers',
        icon: 'i-lucide-users',
        to: '/customers'
      }, {
        label: 'Settings',
        to: '/settings',
        icon: 'i-lucide-settings',
        defaultOpen: true,
        type: 'trigger',
        children: [{
          label: 'General',
          to: '/settings',
          exact: true
        }, {
          label: 'Members',
          to: '/settings/members'
        }, {
          label: 'Notifications',
          to: '/settings/notifications'
        }, {
          label: 'Security',
          to: '/settings/security'
        }, {
          label: 'Billing',
          to: '/settings/billing'
        }]
      }], [{
        label: 'Feedback',
        icon: 'i-lucide-message-circle',
        to: 'https://github.com/nuxt-ui-pro/dashboard',
        target: '_blank'
      }, {
        label: 'Help & Support',
        icon: 'i-lucide-info',
        to: 'https://github.com/nuxt/ui-pro',
        target: '_blank'
      }]]
    }
  }
})