# AGENTS.md

*Comprehensive guide optimized for AI agents working in this repository*

## Document Management Principles

### Meta-Development Principles
1. **Coherence Principle**: If an instruction contradicts this document, the agent MUST report the discrepancy before proceeding
2. **Evolution Principle**: If the user decides to proceed with a decision that contradicts AGENTS.md, propose document update
3. **Reference Principle**: This document is the source of truth for architectural decisions and code patterns
4. **Feedback Principle**: Agents should suggest improvements based on emerging patterns from real usage

### Contradiction Protocol
```
1. Detect contradiction between user instruction and AGENTS.md
2. Inform user of specific discrepancy
3. Explain implications of each approach
4. If user confirms to proceed: implement AND propose AGENTS.md update
5. Document the decision for future reference
```

### Semantic Versioning of Patterns
- **MAJOR**: Fundamental architectural changes (stack, main framework)
- **MINOR**: New development patterns or layers
- **PATCH**: Refinement of existing patterns or new commands

---

## Table of Contents

### 🚀 Quick References
- [Essential Commands](#essential-commands)
- [Critical Paths](#critical-paths)
- [Tech Stack](#tech-stack)

### 🏗️ Fundamentals
- [Essential Architecture](#essential-architecture)  
- [Development Patterns](#development-patterns)
- [Critical Configuration](#critical-configuration)

### ⚡ Workflows
- [Initial Setup](#initial-setup)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

### 📚 Layer Documentation
- [Layer-Specific References](#layer-specific-references)

---

## Essential Commands

| Action | Command | Context |
|--------|---------|---------|
| **Development** | `pnpm saas:dev` | SaaS dashboard |
| | `pnpm landing:dev` | Landing page |
| **Build** | `pnpm saas:build` | Production SaaS |
| | `pnpm saas:typecheck` | Type validation |
| **Backend** | `pnpm backend:sandbox:init` | Setup AWS sandbox |
| | `pnpm amplify:sandbox:generate-outputs` | Config generation |
| **Billing** | `pnpm billing:stripe:sync` | Sync plans to Stripe |
| | `pnpm billing:stripe:listen` | Webhook development |

---

## Critical Paths

| Element | Path | Purpose |
|---------|------|---------|
| **Main Config** | `apps/saas/app/app.config.ts` | Navigation + billing |
| **Billing Plans** | `apps/saas/app/billing-plans.json` | Plans definition |
| **Auth Config** | `apps/backend/amplify/auth/resource.ts` | Cognito setup |
| **DB Schema** | `apps/backend/amplify/data/resource.ts` | Data models |
| **Backend Config** | `apps/backend/amplify/backend.ts` | AWS Amplify |

---

## Tech Stack

### Core Stack
- **Frontend**: Nuxt 4 (SSR/SSG) + TypeScript
- **Backend**: AWS Amplify Gen2 + DynamoDB + Cognito
- **UI**: Nuxt UI Pro + Tailwind CSS
- **Billing**: Stripe + webhooks
- **Package Manager**: pnpm (workspaces)

### Key Architectural Decisions
- **Layers First**: Shared functionality via Nuxt Layers
- **Composables First**: Reusable logic in composables
- **Type Safety**: Strict TypeScript + Amplify generated types
- **Component System**: Nuxt UI/Pro over custom implementations

---

## Essential Architecture

### App Structure
```
apps/
├── backend/        # AWS Amplify Gen2 backend
├── saas/          # Main dashboard (SSR)
└── landing/       # Marketing site (SSG)
```

### Shared Layers (Nuxt Layers)
```
layers/
├── uix/           # UI foundation + Tailwind
├── amplify/       # AWS integration
├── auth/          # Authentication
├── billing/       # Stripe + subscriptions  
├── debug/         # Dev tools
└── i18n/          # Internationalization
```

### Dependency Flow
- **SaaS**: `uix` → `amplify` → `auth` → `billing` → `debug` → `i18n`
- **Landing**: `uix` → `amplify` → `i18n`

### Core Data Models
```typescript
UserSubscription {
  userId: string
  stripeSubscriptionId?: string
  planId: string
  status: string
  currentPeriodEnd?: Date
}

StripeCustomer {
  userId: string
  stripeCustomerId: string
}

BillingUsage {
  userId: string
  period: string
  projects?: number
  apiRequests?: number
}
```

---

## Development Patterns

### 1. Composables-First
**ALWAYS check existing composables before implementing new functionality**
- Locations: `/composables/`, `/layers/*/composables/`
- Core composables: `useUser()`, `useBilling()`, `useAuth()`

### 2. Nuxt UI Priority
**ALWAYS consult https://ui.nuxt.com/components before creating custom components**
- Dashboard: Use `UDashboard*` components 
- Forms: `UButton`, `UInput`, `USelect`
- Layout: `UCard`, `UAlert`, `UModal`

### 3. TypeScript Strict
- Use Amplify generated types
- Explicit interfaces for component props
- `generateClient()` for GraphQL operations

### 4. File Naming Conventions
```
components/     # PascalCase
composables/    # camelCase (use- prefix)
middleware/     # kebab-case
pages/         # kebab-case (file routing)
server/api/    # kebab-case
```

### 5. Authentication
```typescript
// Protect pages
definePageMeta({ middleware: 'auth' })

// Use in components
const { user, isAuthenticated } = useUser()
```

### 6. Commit Message Convention

**Follow Conventional Commits specification for consistent git history**

#### Format
```
<type>(<scope>): <description>
```

#### Commit Types
- **`feat`**: New features or functionality
- **`fix`**: Bug fixes
- **`refactor`**: Code improvements without behavior changes
- **`chore`**: Maintenance, dependencies, build tasks
- **`doc`**: Documentation updates
- **`test`**: Testing related changes
- **`style`**: Code formatting, linting fixes

#### Common Scopes
- **`billing`**: Stripe billing/subscription features
- **`auth`**: Authentication and authorization
- **`i18n`**: Internationalization
- **`saas`**: SaaS app specific changes
- **`amplify`**: AWS Amplify backend
- **`uix`**: UI/design system changes
- **`debug`**: Development/debugging tools
- **`deps`**: Dependencies
- **`docs`**: Documentation files

#### Examples (from project history)
```bash
feat(billing): integrate Stripe billing system with subscription management and webhooks
feat(auth): implement forgot password
feat(i18n): add internationalization support
chore(deps): bump packages
refactor(billing): improve billing sync script
doc(readme): update readme with last updates
feat(debug): add debug layer
```

#### Rules
- Use present tense: "add" not "added"
- Start description with lowercase
- No period at the end
- Keep total message under 72 characters
- Be descriptive but concise
- Focus on **what** and **why**, not **how**

---

## Critical Configuration

### Essential Environment Variables
```bash
# Development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Auto-generated
SANDBOX_STACK_NAME=amplify-*-sandbox-*
```

### Navigation (app.config.ts)
```typescript
ui: {
  sidebar: {
    main: [
      [{ label: 'Dashboard', icon: 'i-lucide-home', to: '/dashboard' }],
      [{ 
        label: 'Settings', 
        icon: 'i-lucide-settings',
        children: [/*...*/]
      }]
    ]
  }
}
```

**Navigation Rules**:
- Icons: `i-lucide-[name]` (see https://lucide.dev/icons)
- Groups = nested arrays
- Children for submenus

### Billing Plans Schema
```json
{
  "id": "plan-id",
  "name": "Plan Name", 
  "price": 0,
  "interval": "month",
  "stripePriceId": "price_...",  // Auto-updated
  "features": ["Feature 1", "..."],
  "limits": { "projects": 1, "users": 1 }
}
```

---

## Initial Setup

### Required Sequence
```bash
1. pnpm install
2. pnpm backend:sandbox:init
3. pnpm amplify:sandbox:generate-outputs  
4. pnpm amplify:sandbox:generate-graphql-client-code
5. pnpm saas:dev
```

### Environment Variables
Create `.env.local` in relevant apps with Stripe keys for full functionality.

---

## Common Tasks

### New Dashboard Page
1. Create in `apps/saas/app/pages/`
2. Use layout: `<UDashboardPage><UDashboardPanel>...</UDashboardPanel></UDashboardPage>`
3. Auth: `definePageMeta({ middleware: 'auth' })`
4. Update navigation in `app.config.ts`

### New Billing Plan  
1. Edit `apps/saas/app/billing-plans.json`
2. `pnpm billing:stripe:sync`
3. ✅ Auto-available in UI

### New Layer
1. Create folder in `layers/`
2. `nuxt.config.ts` with configuration
3. Add to `extends` in target app

### New DB Model
1. Edit `apps/backend/amplify/data/resource.ts`  
2. `pnpm amplify:sandbox:generate-graphql-client-code`
3. Use generated types in frontend

---

## Troubleshooting

### Critical Errors
| Error | Solution |
|-------|----------|
| "Amplify not configured" | `pnpm amplify:sandbox:generate-outputs` |
| Stripe sync fails | Check `STRIPE_SECRET_KEY` + valid JSON |
| Auth redirect loops | Review middleware + Cognito setup |
| Build failures | TypeScript errors + imports + layer deps |

### Debug Tools
- **Development**: `/debug` page
- **Logs**: AWS Console (Amplify)
- **Billing**: Stripe Dashboard

---

## Key Composables and Components

### Billing System
```typescript
// Primary composable
const {
  subscription,
  currentPlan, 
  availablePlans,
  createCheckoutSession,
  createPortalSession
} = useBilling()
```

**Available Components**:
- `<BillingSubscriptionCard />` - Current subscription
- `<BillingPlansGrid />` - Plan selection + checkout
- `<BillingPortal />` - Stripe customer portal

### Stripe Customer Portal
**⚠️ Requires**: Portal activated in Stripe Dashboard + active subscription
**Endpoint**: `POST /api/billing/portal`

---

## Version Information

- **Package Manager**: pnpm 10.13.1+ (with corepack)
- **Node.js**: 18+ (required for Nuxt 4)
- **Last Updated**: 2025-09-11

---

## Layer-Specific References

Each layer provides detailed documentation for AI agents to understand specific implementations and usage patterns.

### Layer README.md Files

| Layer | Purpose | README Location |
|-------|---------|----------------|
| **uix** | UI foundation, design system, Nuxt UI Pro + Tailwind | [layers/uix/README.md](layers/uix/README.md) |
| **amplify** | AWS integration, GraphQL client, storage | [layers/amplify/README.md](layers/amplify/README.md) |
| **auth** | Authentication, AWS Cognito, middleware | [layers/auth/README.md](layers/auth/README.md) |
| **billing** | Stripe integration, subscriptions, payments | [layers/billing/README.md](layers/billing/README.md) |
| **i18n** | Internationalization, translations, formatting | [layers/i18n/README.md](layers/i18n/README.md) |
| **debug** | Development tools, debugging utilities | [layers/debug/README.md](layers/debug/README.md) |

### Layer Documentation Rules

**Meta-Rules for Layer READMEs:**
1. **Same Principles Apply**: All meta-principles defined in this AGENTS.md also apply to layer README.md files
2. **Contradiction Protocol**: If changes contradict layer README, follow same 5-step protocol
3. **Update Requirement**: When components, composables, or utilities are added/removed/modified, update corresponding README.md
4. **Reference Context**: Use layer READMEs for specific implementation details and examples
5. **Consistency**: Maintain consistent documentation structure across all layer READMEs

**When to Consult Layer READMEs:**
- **Component Usage**: Specific component props, events, and examples
- **Composable Details**: Method signatures, return values, usage patterns  
- **API Endpoints**: Server routes, request/response formats
- **Configuration**: Layer-specific setup and customization
- **Troubleshooting**: Layer-specific issues and solutions

---

*This document is optimized for efficient consultation by AI agents. For architectural changes, follow the contradiction protocol defined above.*