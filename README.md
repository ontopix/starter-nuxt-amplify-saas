# Nuxt Amplify SaaS Starter

A comprehensive SaaS boilerplate built with Nuxt 4 and AWS Amplify Gen2, using amonorepo structure with Nuxt layers architecture. This starter provides everything you need to build a modern, scalable SaaS application with authentication, billing, and multi-tenant support.

## 🏗️ Architecture Overview

This project consists of three main applications built on a shared foundation:

- **Backend** (`apps/backend/`): AWS Amplify Gen2 infrastructure with CDK, Lambda functions, and GraphQL API
- **Landing** (`apps/landing/`): Public marketing site built with Nuxt SSG
- **SaaS** (`apps/saas/`): Main authenticated SaaS application built with Nuxt SSR

### Nuxt Layers System

The project uses Nuxt layers for code organization and reusability:

- **UIX Layer** (`layers/uix/`): Foundation UI components with Nuxt UI Pro and Tailwind CSS
- Additional layers: auth, amplify, billing, app, site, debug (planned)

```
apps/
├── backend/     # AWS Amplify Gen2 infrastructure
├── landing/     # Public marketing site
└── saas/        # Main SaaS application

layers/
└── uix/         # UI/UX foundation layer

docs/
├── ARCHITECTURE.md  # Technical architecture details
├── PRD.md          # Product requirements
└── PLAN/           # Implementation phases
```

## 🛠️ Technology Stack

- **Frontend**: Nuxt 4, Vue 3, TypeScript, Nuxt UI Pro, Tailwind CSS
- **Backend**: AWS Amplify Gen2, CDK, Lambda, AppSync GraphQL
- **Database**: DynamoDB with GraphQL API
- **Authentication**: AWS Cognito with MFA support
- **Billing**: Stripe integration
- **AI**: Amazon Bedrock integration

## 📋 Prerequisites

- **Node.js**: >= 20.19.0
- **pnpm**: 10.13.1 (required)
- **AWS CLI**: Configured with appropriate credentials
- **AWS Amplify CLI**: Latest version

## 🚀 Development Environment Setup

### 1. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm@10.13.1

# Install project dependencies
pnpm install
```

### 2. Backend Development with Sandbox

The backend uses AWS Amplify Gen2 with a sandbox environment for local development:

```bash
# Navigate to backend directory
cd apps/backend

# Start the sandbox environment (deploys to AWS)
pnpm exec ampx sandbox

# This will:
# - Deploy backend infrastructure to AWS
# - Generate GraphQL types
# - Provide local development endpoints
```

### 3. Frontend Development

Once the backend sandbox is running, start the frontend applications:

#### SaaS Application (Main App)
```bash
# Start the SaaS app development server
pnpm saas:dev

# Available at: http://localhost:3000
```

#### Landing Page
```bash
# Start the landing page development server
pnpm landing:dev

# Available at: http://localhost:3001
```

### 4. Development Workflow

1. **Backend First**: Always ensure the backend sandbox is running before starting frontend development
2. **Code Generation**: The sandbox automatically generates TypeScript types from your GraphQL schema
3. **Hot Reload**: Both frontend applications support hot module replacement
4. **Layer Development**: Make changes to the UIX layer and see them reflected across applications

## 🔧 Building Applications

### SaaS Application
```bash
cd apps/saas
pnpm build
```

### Landing Page (Static Site)
```bash
cd apps/landing
pnpm generate
```

### Backend
```bash
cd apps/backend
pnpm exec ampx deploy
```

## 🌐 Production Deployment on AWS Amplify

### 1. Backend Deployment

Deploy your backend infrastructure to production:

```bash
cd apps/backend

# Deploy to production branch
pnpm exec ampx pipeline-deploy --branch production --app-id YOUR_APP_ID

# Or deploy directly
pnpm exec ampx deploy --branch production
```

### 2. Frontend Deployment

#### Option A: Using Amplify Hosting (Recommended)

1. **Connect Repository**: Link your Git repository to AWS Amplify Hosting
2. **Configure Build Settings**: Use the provided `amplify.yml` files in each app directory
3. **Environment Variables**: Set required environment variables in Amplify Console

#### Option B: Manual Deployment

**Landing Page:**
```bash
cd apps/landing
pnpm generate
# Upload dist/ folder to S3 or CloudFront
```

**SaaS Application:**
```bash
cd apps/saas
pnpm build
# Deploy .output/ folder to Amplify Hosting or serverless platform
```

### 3. Environment Configuration

Set the following environment variables in AWS Amplify Console:

```bash
# Required for all environments
NODE_VERSION=20.19.0
AMPLIFY_MONOREPO_APP_ROOT=apps/landing  # or apps/saas

# SaaS App specific
NUXT_PUBLIC_AMPLIFY_APP_ID=your_amplify_app_id
NUXT_PUBLIC_AMPLIFY_REGION=us-east-1

# Production specific
NODE_ENV=production
```

### 4. Branch Configuration

- **Main Branch**: Automatically deploys to production
- **Develop Branch**: Deploys to staging environment
- **Feature Branches**: Can be configured for preview deployments

## 🧪 Testing and Quality

### Linting
```bash
# Lint UIX layer
cd layers/uix
pnpm lint

# Add linting for other components as needed
```

### Type Checking
```bash
# Type check applications
cd apps/saas
pnpm typecheck

cd apps/landing
pnpm typecheck
```

## 📚 Key Features

- **Multi-Tenant Architecture**: Data isolation by organization ID
- **Role-Based Access Control**: Owner, Admin, Member roles
- **GraphQL API**: Type-safe backend with auto-generated types
- **Authentication**: AWS Cognito with MFA support
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG 2.1 AA compliance
- **Dark/Light Mode**: Built-in theme switching

## 🔄 Development Commands Reference

```bash
# Package management
pnpm install                    # Install dependencies
pnpm saas:dev                  # Start SaaS app development
pnpm landing:dev               # Start landing page development

# Backend
cd apps/backend && pnpm exec ampx sandbox    # Start sandbox
cd apps/backend && pnpm exec ampx deploy     # Deploy backend

# Building
cd apps/saas && pnpm build              # Build SaaS app
cd apps/landing && pnpm generate        # Generate landing page

# Quality
cd layers/uix && pnpm lint              # Lint UIX layer
```

## 📖 Documentation

For detailed information, refer to:

- `docs/ARCHITECTURE.md` - Complete technical architecture
- `docs/PRD.md` - Product requirements and specifications
- `docs/PLAN/` - Implementation phases and roadmap
- `CLAUDE.md` - Development guidelines for AI assistance

## 🤝 Contributing

1. Follow the established patterns in each layer
2. Ensure accessibility compliance (WCAG 2.1 AA)
3. Test both light and dark mode implementations
4. Run linting before committing changes

## 📄 License

[Add your license information here]
