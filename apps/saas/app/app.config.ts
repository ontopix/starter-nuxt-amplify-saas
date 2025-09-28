export default defineAppConfig({
  billing: {
    plans: [
    {
      "id": "free",
      "name": "Free",
      "description": "Perfect for getting started with basic usage",
      "monthlyPrice": 0,
      "yearlyPrice": 0,
      "priceCurrency": "USD",
      "stripeProductId": "",
      "monthlyStripePriceId": "",
      "yearlyStripePriceId": "",
      "features": [
        "1 project",
        "1 team member",
        "1 GB storage",
        "Community support"
      ],
      "limits": {
        "projects": 1,
        "teamMembers": 1,
        "storage": 1
      }
    },
    {
      "id": "starter",
      "name": "Starter",
      "description": "Great for small teams and early projects",
      "monthlyPrice": 5.95,
      "yearlyPrice": 65,
      "priceCurrency": "USD",
      "stripeProductId": "",
      "monthlyStripePriceId": "",
      "yearlyStripePriceId": "",
      "features": [
        "5 projects",
        "Up to 3 team members",
        "10 GB storage",
        "Email support"
      ],
      "limits": {
        "projects": 5,
        "teamMembers": 3,
        "storage": 10
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "description": "Advanced features for growing teams",
      "monthlyPrice": 19.95,
      "yearlyPrice": 215,
      "priceCurrency": "USD",
      "stripeProductId": "",
      "monthlyStripePriceId": "",
      "yearlyStripePriceId": "",
      "features": [
        "Unlimited projects",
        "Up to 10 team members",
        "100 GB storage",
        "Priority support",
        "Advanced analytics"
      ],
      "limits": {
        "projects": -1,
        "teamMembers": 10,
        "storage": 100
      }
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "Custom solutions for large organizations",
      "monthlyPrice": 0,
      "yearlyPrice": 0,
      "priceCurrency": "USD",
      "stripeProductId": "",
      "monthlyStripePriceId": "",
      "yearlyStripePriceId": "",
      "features": [
        "Unlimited projects",
        "Unlimited team members",
        "1 TB+ storage",
        "Dedicated account manager",
        "Custom integrations",
        "Premium support SLA"
      ],
      "limits": {
        "projects": -1,
        "teamMembers": -1,
        "storage": -1
      }
    }
    ]
  },
  // Instance-specific UI configuration
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
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
