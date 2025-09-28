export default defineAppConfig({
  // Instance-specific billing configuration
  billing: {
    plans: [
      {
        "id": "free",
        "name": "Free",
        "description": "Perfect for getting started",
        "price": 0,
        "stripePriceId": "",
        "features": [
          "1 project",
          "1 team member",
          "1GB storage",
          "Basic support"
        ]
      },
      {
        "id": "pro",
        "name": "Pro",
        "description": "For growing teams and businesses",
        "price": 29,
        "stripePriceId": "",
        "features": [
          "Unlimited projects",
          "10 team members",
          "100GB storage",
          "Priority support",
          "Advanced analytics"
        ]
      },
      {
        "id": "enterprise",
        "name": "Enterprise",
        "description": "For large organizations",
        "price": 99,
        "stripePriceId": "",
        "features": [
          "Unlimited projects",
          "Unlimited team members",
          "1TB storage",
          "Dedicated support",
          "Advanced security",
          "SSO integration"
        ]
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