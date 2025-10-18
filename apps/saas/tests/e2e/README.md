# E2E Testing Architecture

Comprehensive End-to-End testing suite for the SaaS application using Playwright.

## Architecture Overview

The E2E test suite follows a **layer-based architecture** that mirrors the application's structure:

```
tests/e2e/
├── fixtures/           # Test data (copied from backend seed)
│   ├── users.json           # Test user accounts
│   └── stripe-cards.json    # Stripe test card data
├── config/             # Test configuration
│   └── selectors.json       # Centralized UI selectors
├── helpers/            # Reusable test utilities
│   ├── auth.js             # Authentication operations
│   ├── assertions.js       # Custom assertions
│   └── stripe.js           # Stripe interactions
├── utils/              # Utility functions
│   ├── cache.js            # Test data caching
│   └── selectors.js        # Selector helpers
└── specs/              # Test specifications
    ├── flows/              # Integration tests (multi-layer)
    │   └── new-user-journey.spec.js
    └── layers/             # Atomic tests (single-layer)
        ├── auth/
        │   └── auth.spec.js
        └── billing/
            ├── new-user.spec.js
            └── plans.spec.js
```

## Test Organization

### Two Types of Tests

#### 1. **Flow Tests** (`specs/flows/`)
Integration tests that combine functionality from multiple layers to test complete user journeys.

**Characteristics:**
- Test end-to-end user scenarios
- May involve multiple layers (auth + billing + others)
- Focus on real-world use cases
- Longer execution time

**Example:**
- `new-user-journey.spec.js` - Complete flow from signup to subscription

#### 2. **Layer Tests** (`specs/layers/`)
Atomic tests organized by application layer, focusing on isolated functionality.

**Characteristics:**
- Test single layer functionality
- Independent and focused
- Faster execution
- Easy to maintain

**Organization:**
```
specs/layers/
├── auth/                    # Authentication layer tests
│   ├── signup.spec.js      # User registration & email verification
│   └── signin.spec.js      # User login & authentication
└── billing/                 # Billing layer tests
    ├── new-user.spec.js    # New user billing state
    └── plans.spec.js       # Plan verification tests
```

## Fixtures System

Fixtures provide consistent test data across all tests. **All test data is copied from backend seed data** and lives in `fixtures/`.

### Why Copy Instead of Reference?

1. **Independence** - Tests don't depend on backend file structure
2. **Stability** - Changes to seed data don't break tests
3. **Clarity** - Test data is explicitly defined for testing
4. **Flexibility** - Can modify test data without affecting seed

### Available Fixtures

#### `fixtures/users.json`
Test user accounts organized by plan type:

```json
{
  "testUsers": {
    "free": [
      {
        "email": "test+free1@ontopix.ai",
        "password": "TestPassword123!",
        "plan": "free",
        "hasPaymentMethod": false
      }
    ],
    "pro": [ /* ... */ ],
    "enterprise": [ /* ... */ ]
  }
}
```

**Usage:**
```javascript
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load fixtures in test.beforeAll()
test.beforeAll(() => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const fixturesPath = join(__dirname, '../../../fixtures/users.json')
  const fixturesData = JSON.parse(readFileSync(fixturesPath, 'utf8'))
  testUsers = fixturesData.testUsers
})

// Use in tests
test('should login with free user', async () => {
  const freeUser = testUsers.free[0]
  await auth.login(freeUser)
  // ... assertions
})
```

#### `fixtures/stripe-cards.json`
Stripe test credit cards:

```json
{
  "successCards": {
    "visa": {
      "number": "4242424242424242",
      "brand": "visa",
      "description": "Basic successful Visa payment"
    }
  },
  "testData": {
    "defaultExpiry": "12/28",
    "defaultCvc": "123"
  }
}
```

## Helpers

Reusable utilities for common test operations.

### `AuthHelpers` (`helpers/auth.js`)
Authentication and navigation operations:

```javascript
const auth = new AuthHelpers(page)

await auth.login(user)              // Login with credentials
await auth.signup(user)             // Create new account
await auth.verifyEmail(email)       // Verify email
await auth.logout()                 // Logout
await auth.goto('/path')            // Navigate with base URL
const isLoggedIn = await auth.isLoggedIn()  // Check auth state
```

### `AssertionHelpers` (`helpers/assertions.js`)
Custom assertions for common verification patterns:

```javascript
const assertions = new AssertionHelpers(page)

// Billing assertions
await assertions.assertCurrentPlan('free')
await assertions.assertPaymentMethodExists('4242')
await assertions.assertNoPaymentMethods()
await assertions.assertNoInvoices()

// Subscription assertions
await assertions.assertSubscriptionActive('pro')
await assertions.waitForSubscriptionSync('pro')
```

### `StripeHelpers` (`helpers/stripe.js`)
Stripe integration utilities:

```javascript
const stripe = new StripeHelpers(page)

await stripe.addPaymentMethodInPortal(card)
await stripe.changePlanInPortal('pro')
await stripe.returnToApp()
```

## Configuration

### Centralized Selectors (`config/selectors.json`)

All UI selectors are centralized for easy maintenance:

```json
{
  "auth": {
    "emailInput": ["input[name='email']", "input[type='email']"],
    "loginButton": ["button:has-text('Sign in')", "[type='submit']"]
  },
  "billing": {
    "currentPlan": ["[data-testid='current-plan']", "h2:has-text('Plan')"],
    "manageSubscriptionButton": ["button:has-text('Change Plan')"]
  }
}
```

**Usage:**
```javascript
const element = await Selectors.findElement(page, 'auth', 'emailInput')
```

**Benefits:**
- Single source of truth for selectors
- Easy updates when UI changes
- Supports multiple fallback selectors
- Consistent across all tests

## Running Tests

### Prerequisites

Ensure test data is seeded in the database:

```bash
# Seed Stripe plans
pnpm backend:sandbox:seed:plans

# Seed test users
pnpm backend:sandbox:seed:users
```

### Run Commands

```bash
# All E2E tests
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e

# Specific layer tests
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:auth              # All auth tests
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:auth:signup       # Signup tests only
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:auth:signin       # Signin tests only
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:billing           # All billing tests
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:billing:plans     # Plan tests only

# Flow tests
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:flows
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:flow:new-user-journey

# Development modes
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:ui      # UI mode
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:headed  # Visible browser
pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e:debug   # Step-through debug
```

### Run Specific Tests

```bash
# By file path
npx playwright test tests/e2e/specs/layers/auth/auth.spec.js

# By test name
npx playwright test -g "Free plan user"

# Single test with UI
npx playwright test tests/e2e/specs/layers/billing/plans.spec.js --ui
```

## Test Development

### Adding New Layer Tests

1. **Create test file** in appropriate layer folder:
   ```
   specs/layers/[layer-name]/[test-name].spec.js
   ```

2. **Use fixtures** for test data:
   ```javascript
   const users = require('../../../fixtures/users.json')
   const testUser = users.testUsers.free[0]
   ```

3. **Use helpers** for common operations:
   ```javascript
   const auth = new AuthHelpers(page)
   const assertions = new AssertionHelpers(page)
   ```

4. **Follow naming conventions**:
   - File: `[feature].spec.js` (short, descriptive)
   - Test: `describe('Layer Name - Feature')`
   - Individual: `test('specific behavior verification')`

### Adding New Flow Tests

1. **Create flow file**:
   ```
   specs/flows/[flow-name].spec.js
   ```

2. **Use serial execution** for dependent steps:
   ```javascript
   test.describe.serial('User Journey', () => {
     // Steps execute in order
   })
   ```

3. **Share state** between tests:
```javascript
   let sharedState = {}

   test('Step 1', async () => {
     sharedState.userId = await createUser()
   })

   test('Step 2', async () => {
     await upgradeUser(sharedState.userId)
   })
   ```

### Updating Fixtures

When backend seed data changes:

1. **Update fixture file** (e.g., `fixtures/users.json`)
2. **Add metadata** comment documenting the change
3. **Run tests** to verify compatibility
4. **Update tests** if needed

**Example:**
```json
{
  "metadata": {
    "source": "apps/backend/amplify/seed/data/users.json",
    "lastUpdated": "2025-01-17",
    "changes": "Added starter plan users"
  }
}
```

## Best Practices

### Test Structure

✅ **DO:**
- One layer per folder (`specs/layers/auth/`, `specs/layers/billing/`)
- Short, descriptive file names (`auth.spec.js`, `plans.spec.js`)
- Use fixtures for all test data
- Use helpers for common operations
- Use centralized selectors

❌ **DON'T:**
- Reference backend seed files directly
- Hardcode selectors in tests
- Duplicate helper logic
- Mix layer concerns in atomic tests

### Data Management

✅ **DO:**
- Copy test data to `fixtures/`
- Document fixture sources
- Keep fixtures in sync with seed data
- Use descriptive fixture structure

❌ **DON'T:**
- Import from `../../backend/seed/`
- Hardcode user credentials
- Generate random test data
- Share fixtures between unrelated tests

### Selector Strategy

✅ **DO:**
- Use `Selectors.get()` from config
- Provide multiple fallback selectors
- Use semantic attributes (data-testid, name)
- Document selector purposes

❌ **DON'T:**
- Hardcode CSS selectors
- Rely on brittle XPath
- Use index-based selection
- Skip timeout handling

## Troubleshooting

### Common Issues

**Test fails with "User not found"**
```bash
# Solution: Seed test users
pnpm backend:sandbox:seed:users
```

**Selector timeout errors**
```bash
# Solution: Check config/selectors.json
# Add new selector or update existing ones
```

**Payment method not showing**
```bash
# Solution: Verify Stripe configuration
# Check STRIPE_SECRET_KEY in sandbox secrets
pnpm backend:sandbox:seed:users  # Re-seed with Stripe data
```

**Navigation errors**
```javascript
// Wrong:
await page.goto('/settings/billing')

// Correct:
await auth.goto('/settings/billing')
```

### Debug Workflow

1. **Run in headed mode** to see browser:
   ```bash
   pnpm test:e2e:headed -- [test-file]
   ```

2. **Use UI mode** for interactive debugging:
   ```bash
   pnpm test:e2e:ui -- [test-file]
   ```

3. **Add console logs** in helpers:
   ```javascript
   console.log('[AuthHelper] Logging in:', user.email)
   ```

4. **Check selector visibility**:
   ```javascript
   const element = await Selectors.findElement(page, 'auth', 'emailInput')
   console.log('Element visible:', await element.isVisible())
   ```

## Architecture Benefits

### Maintainability
- **Clear separation** between flows and layers
- **Centralized configuration** (selectors, fixtures)
- **Reusable components** (helpers, utils)
- **Independent tests** that don't affect each other

### Scalability
- **Easy to add** new layer tests
- **Simple to update** when UI changes
- **Flexible fixtures** for different scenarios
- **Parallel execution** of independent tests

### Developer Experience
- **Clear organization** - easy to find tests
- **Consistent patterns** - predictable structure
- **Good tooling** - Playwright UI, headed mode
- **Fast feedback** - atomic tests run quickly

## Current Test Coverage

### Auth Layer (`specs/layers/auth/`)

**Signup Tests** (`signup.spec.js`)
- ✅ Create new user and verify email
- ✅ Handle signup with existing email

**Signin Tests** (`signin.spec.js`) - Uses `fixtures/users.json`
- ✅ Login successfully with valid credentials (free user)
- ✅ Fail login with invalid email
- ✅ Fail login with wrong password (pro user)
- ✅ Fail login with empty credentials

### Billing Layer (`specs/layers/billing/`)
- ✅ New user free plan verification (`new-user.spec.js`)
- ✅ Free plan user verification (`plans.spec.js`)
- ✅ Pro plan user verification (`plans.spec.js`)
- ✅ Enterprise plan user verification (`plans.spec.js`)
- ✅ Multiple users independent testing (`plans.spec.js`)

### Flow Tests (`specs/flows/`)
- ✅ New user complete journey (`new-user-journey.spec.js`)
  - Signup → Login → Billing → Payment → Subscription

## Future Enhancements

Potential additions to the test suite:

### Additional Layer Tests
- **Auth Layer**: Password reset, MFA, session timeout
- **Billing Layer**: Plan changes, cancellations, invoice downloads
- **Profile Layer**: User profile updates, preferences
- **Teams Layer**: Team management, invitations, roles

### Additional Flow Tests
- **Upgrade Journey**: Free → Pro → Enterprise
- **Downgrade Journey**: Enterprise → Pro → Free
- **Payment Failure Recovery**: Failed payment → Update card → Retry
- **Team Collaboration**: Create team → Invite members → Assign roles

### Infrastructure
- **CI/CD Integration**: Automated test runs on PR
- **Test Reports**: HTML reports with screenshots
- **Performance Tests**: Load testing, stress testing
- **Visual Regression**: Screenshot comparison tests
