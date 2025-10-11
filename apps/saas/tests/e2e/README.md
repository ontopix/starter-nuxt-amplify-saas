# E2E Testing Documentation

This directory contains End-to-End (E2E) tests for the SaaS application using Playwright.

## Structure

```
tests/e2e/
├── .cache/             # Test cache directory (gitignored)
│   └── newly-created-user.json  # Cached user data
├── config/             # Test configuration
│   └── selectors.json      # Centralized UI selectors
├── fixtures/           # Test data files
│   └── stripe-cards.json     # Test credit card data for Stripe testing
├── helpers/            # Reusable test utilities
│   ├── assertions.js         # Custom assertion helpers (cleaned)
│   ├── auth.js              # Authentication helpers (cleaned)
│   ├── data-management.js   # Data management utilities (simplified)
│   └── stripe.js            # Stripe testing utilities (cleaned)
├── specs/              # Test specifications (layer-based)
│   ├── auth.spec.js         # Authentication layer tests (active)
│   └── billing.spec.js      # Billing layer tests (partial - some skipped)
└── utils/              # Utility functions
    ├── cache.js             # Test cache system
    └── selectors.js         # Selector helper utilities
```

## Test Organization

Tests are organized by **layer concepts** that map to the application architecture, ensuring each layer has a single entry point file:

### Auth Layer Tests (`specs/auth.spec.js`)
- **Signup with email verification** - Creates new users and verifies email
- **Login with valid credentials** - Tests authentication flow
- **Login with invalid credentials** - Tests error handling

### Billing Layer Tests (`specs/billing.spec.js`)
- **New user free plan verification** - Verifies free plan state with no payment methods
- **Payment method handling** - Credit card processing (pending implementation)
- **Plan changes and upgrades** - Subscription modifications (pending implementation)
- **Checkout flows** - Stripe Checkout integration (pending implementation)
- **Customer portal integration** - Self-service billing portal (pending implementation)

**Note**: Some billing tests are currently skipped pending implementation of StripeHelpers methods.

## Data Management System

### Multi-Mode Seeding
The application uses a **multi-mode seeding system** that separates data by environment:

- **Test Mode** (`--test`): Optimized data for E2E testing
- **Sandbox Mode** (`--sandbox`): Development data (default)
- **Production Mode** (`--production`): Production-ready data

### Data Seeding
Before running E2E tests, seed the database with test data:

```bash
# Seed test data (recommended before E2E tests)
npm run test:e2e:seed

# Or seed specific components
npm run test:e2e:seed:users
npm run test:e2e:seed:plans
```

This populates the database with:
- **Test users**: `test+free1@ontopix.ai`, `test+pro1@ontopix.ai`, etc.
- **Billing plans**: Free ($0), Pro ($29), Enterprise ($99)
- **Stripe products**: Properly configured for testing

## Fixtures

### `stripe-cards.json`
Simplified test credit card data for Stripe testing:
- **Success cards**: Visa, Mastercard, Amex, Visa Debit
- **Test data**: Default expiry, CVC, and cardholder name
- **No selectors**: Removed UI selector dependencies

### `selectors.json`
Centralized UI selector configuration:
- **Auth selectors**: Login, signup, verification elements
- **Billing selectors**: Plan management, payment methods
- **Stripe selectors**: Checkout form elements
- **Text patterns**: Flexible error and success message detection

### Cache System (`utils/cache.js`)
Persistent test data caching:
- **User caching**: Reuse created users across tests
- **Session persistence**: Maintains state between test runs
- **Performance**: Avoids recreating users for each test

## Helpers

### Authentication Helper (`helpers/auth.js`)
Features **flexible selector system** for robust element finding:
- **Multiple selector fallbacks**: name, id, placeholder, data-testid
- **Automatic retry logic**: Handles dynamic UI loading
- **User management**: Creates and manages test users
- **Email verification**: Handles verification codes

### Stripe Helper (`helpers/stripe.js`)
- **Stripe integration**: Payment processing and webhooks
- **Checkout flows**: Form filling and submission
- **Customer portal**: Self-service billing interface
- **3D Secure**: Authentication handling

### Data Management (`helpers/data-management.js`)
- **Simplified**: Only essential methods remain after cleanup
- **Stripe cards**: Load test card data from `stripe-cards.json`
- **Seeded users**: Access backend-seeded test users (hardcoded)
- **Fixture loading**: JSON data management utilities
- **Legacy removed**: All methods using deleted fixtures removed

## Running Tests

### Basic Commands
```bash
# Run all E2E tests
npx playwright test tests/e2e/specs/

# Run with Playwright UI
npx playwright test tests/e2e/specs/ --ui

# Run in headed mode (visible browser)
npx playwright test tests/e2e/specs/ --headed

# Debug mode (step through tests)
npx playwright test tests/e2e/specs/ --debug
```

### Layer-Specific Tests
```bash
# Run authentication tests only
npx playwright test tests/e2e/specs/auth.spec.js

# Run billing tests only
npx playwright test tests/e2e/specs/billing.spec.js

# Run specific test by name
npx playwright test tests/e2e/specs/ -g "login with valid credentials"
```

### Full Test Cycle
```bash
# Seed database + run all tests
pnpm backend:sandbox:seed
npx playwright test tests/e2e/specs/

# Seed + run tests in headed mode
pnpm backend:sandbox:seed
npx playwright test tests/e2e/specs/ --headed
```

### Data Management
```bash
# Seed all test data (from backend)
pnpm backend:sandbox:seed

# Seed specific data types
pnpm backend:sandbox:seed:users
pnpm backend:sandbox:seed:plans

# Clean test cache
rm -rf tests/e2e/.cache/
```

## Test Architecture

### Fixture-Based Testing
1. **Fixtures** define consistent test data and scenarios
2. **Helpers** provide reusable utilities for common operations
3. **Specs** orchestrate test flows using helpers and fixtures

### Benefits
- **Consistent data** across test runs
- **Easy maintenance** through centralized fixtures
- **Reusable components** via helper functions
- **Clear separation** of concerns

### Centralized Selector System
The test suite uses a **centralized selector system** with `SelectorHelper`:

```javascript
// Centralized selectors in config/selectors.json
{
  "auth": {
    "emailInput": ["input[name='email']", "input[type='email']"],
    "loginError": {
      "textPatterns": ["Incorrect username or password"],
      "selectors": ["[role='alert']", ".error-message"]
    }
  }
}

// Usage in tests
const element = await SelectorHelper.findElement(page, 'auth', 'emailInput')
```

This provides:
- **Single source of truth** for all selectors
- **Flexible text pattern matching** for error messages
- **Easy maintenance** when UI changes
- **Consistent usage** across all tests

## Best Practices

### Test Organization
1. **One entry point per layer** - Keep Playwright UI organized
2. **Use helpers** for common operations instead of duplicating code
3. **Leverage fixtures** for consistent test data
4. **Group related tests** in describe blocks by feature

### Data Management
1. **Seed before testing** - Always populate database with test data
2. **Use test-specific data** - Separate from development data
3. **Clean up after runs** - Maintain clean test state
4. **Cache verified users** - Avoid recreating successful accounts

### Selector Strategy
1. **Use SelectorHelper** - Always use centralized selectors instead of hardcoded ones
2. **Prefer semantic selectors** - name, id, data-testid over CSS
3. **Use textPatterns for messages** - Flexible error and success message detection
4. **Add wait conditions** - Handle dynamic content loading
5. **Test error scenarios** - Verify proper error handling

## Troubleshooting

### Common Issues
- **Selector timeouts**: Check if UI elements have changed in `config/selectors.json`
- **Authentication failures**: Verify test users exist in database
- **Payment failures**: Ensure Stripe test keys are configured
- **Seed failures**: Check AWS permissions for sandbox access
- **Navigation errors**: Use `auth.goto()` instead of `page.goto()` for relative URLs
- **Missing methods**: Some StripeHelpers methods are pending implementation

### Debug Steps
1. Run tests in **headed mode** to see browser actions
2. Use **debug mode** to step through test execution
3. Check **test data seeding** completed successfully
4. Verify **application is running** on expected port

## Multi-Mode Seeding Integration

### Backend Integration
The E2E tests integrate with the backend's multi-mode seeding system:

```bash
# Backend seeding (from apps/backend)
npm run sandbox:seed:test          # Seed test environment
npm run sandbox:seed:test:users    # Seed only test users
npm run sandbox:seed:test:plans    # Seed only test plans

# Frontend integration (from apps/saas)
npm run test:e2e:seed             # Calls backend test seeding
npm run test:e2e:full             # Seed + run tests
```

### Data Directories
The backend maintains separate data directories:
- `apps/backend/amplify/seed/data/test/` - E2E test data
- `apps/backend/amplify/seed/data/sandbox/` - Development data
- `apps/backend/amplify/seed/data/production/` - Production data

### Environment Modes
- **SEED_MODE=test**: Optimized for E2E testing scenarios
- **SEED_MODE=sandbox**: Default development environment
- **SEED_MODE=production**: Production deployment data

This ensures complete separation between test and development data, preventing test contamination and enabling reliable E2E testing.

## Current Status

### ✅ Completed Cleanup
The E2E test suite has been cleaned up and optimized:

- **Legacy code removed**: All unused methods and fixtures deleted
- **Centralized selectors**: All tests use `SelectorHelper` for consistent element finding
- **Navigation fixed**: All `page.goto()` calls replaced with `auth.goto()` for proper URL handling
- **Cache system**: User caching implemented for test performance
- **Simplified architecture**: Only essential, actively-used code remains

### 🚧 Pending Implementation
Some billing tests are currently skipped pending implementation of StripeHelpers methods:

- `fillPaymentMethodForm()` - Fill payment method forms
- `savePaymentMethod()` - Save payment methods
- `selectPlan()` - Select billing plans
- `completeCheckout()` - Complete Stripe checkout

### 📁 File Status
- **Active**: `auth.spec.js`, `billing.spec.js` (partial), `selectors.json`, `stripe-cards.json`
- **Cleaned**: `data-management.js`, `auth.js`, `stripe.js`, `assertions.js`
- **Removed**: `billing.js`, `test-cleanup.js`, legacy fixtures
- **New**: `cache.js`, `selectors.js`, centralized selector system
