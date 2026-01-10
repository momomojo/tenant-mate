# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
bun run dev              # Start dev server on port 8080
bun run build            # Production build
bun run build:dev        # Development build
bun run lint             # ESLint
bun run preview          # Preview production build

# Testing (Vitest)
bun run test             # Run tests in watch mode
bun run test:run         # Run tests once
bun run test:ui          # Open Vitest UI
bun run test:coverage    # Run with coverage report

# Supabase
supabase start           # Start local Supabase
supabase db push         # Push migrations to remote
supabase functions serve # Local Edge Functions
supabase gen types typescript --project-id xbtuztzcgxhzvsvfcjvk > src/integrations/supabase/types.ts  # Regenerate types
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite 7
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **State**: TanStack React Query v5
- **Payments**: Stripe Connect + Stripe Elements
- **Forms**: React Hook Form + Zod validation

### Data Flow Architecture

```
User Action → React Component → TanStack Query Hook → Supabase Client → PostgreSQL
                                                   ↓
                                            Edge Functions (for Stripe)
```

**State Management Pattern**: All server state uses TanStack Query. No Redux/Zustand. Queries have 5-minute staleTime by default (configured in `App.tsx`).

### Key Architectural Patterns

1. **Supabase Client** (`src/integrations/supabase/client.ts`): Singleton client with PKCE auth flow, auto-refresh tokens, session persistence to localStorage.

2. **Auth Hook** (`src/hooks/useAuthenticatedUser.ts`): Central auth state management. Returns `{ user, isLoading, error }`. Listens to auth state changes via `onAuthStateChange`.

3. **Database Types**: Auto-generated in `src/integrations/supabase/types.ts`. Regenerate after schema changes using the command above.

4. **Path Alias**: `@/` maps to `./src/` (configured in tsconfig.json and vite.config.ts).

### Stripe Connect Flow

1. Landlord signs up → `stripe_accounts` record created
2. Landlord completes onboarding → `StripeOnboarding.tsx`
3. Tenant makes payment → `create-checkout-session` Edge Function creates Stripe Checkout session
4. Payment completed → `stripe-webhook` Edge Function processes event, updates `rent_payments` and `payment_transactions`
5. Receipt generated → `generate-receipt` Edge Function

Edge Functions are in `supabase/functions/`. They use Deno and import from esm.sh.

### Database Schema (Key Tables)

- `profiles` - User profiles linked to auth.users (landlords and tenants)
- `properties` → `units` → `tenant_units` (property hierarchy)
- `rent_payments` → `payment_transactions` (payment tracking)
- `company_stripe_accounts` / `automatic_payments` (Stripe integration)
- `maintenance_requests`, `documents` (operational data)

### Routes

Defined in `App.tsx`:
- `/` - Landing page
- `/auth` - Login/Signup
- `/dashboard` - Main dashboard (role-based with dynamic stats)
- `/properties`, `/properties/:id` - Property management
- `/tenants`, `/tenants/:id` - Tenant management
- `/payments` - Payment processing (Stripe Checkout)
- `/documents` - Document management
- `/maintenance` - Maintenance request system
- `/reports` - Financial reports (Rent Roll, Income, Property Summary)
- `/settings` - User profile and settings
- `/stripe-onboarding` - Stripe Connect setup

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://xbtuztzcgxhzvsvfcjvk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_STRIPE_PUBLISHABLE_KEY=<stripe_key>
```

Edge Functions require (set in Supabase dashboard):
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...           # For email notifications (optional)
FROM_EMAIL=noreply@yourdomain   # Sender email (optional)
```

## TypeScript Configuration

- `noImplicitAny: false`, `strictNullChecks: false` - lenient type checking
- Unused vars/params allowed (ESLint rule disabled)
- Uses project references: `tsconfig.app.json`, `tsconfig.node.json`

## Testing

- **Framework**: Vitest 4 + Testing Library + jsdom
- **Setup file**: `src/test/setup.ts` (mocks for matchMedia, ResizeObserver, localStorage)
- **Test utils**: `src/test/test-utils.tsx` (custom render with QueryClient + Router providers)
- **Pattern**: Co-locate tests with source files as `*.test.ts(x)` or use `src/test/` for integration tests

When testing components that use the App's providers (Router, QueryClient), use the custom render from `test-utils`. For testing the full App component, use the standard render since App includes its own providers.

## Current Status: 100% Complete

### Completed Features
- User authentication (signup, login, role-based access)
- Property management (CRUD for properties and units)
- Tenant management (assignment, lease tracking)
- Maintenance request system (create, track, status updates)
- Payment system (Stripe Checkout integration via Edge Functions)
- Reports page (Rent Roll, Income Report, Property Summary)
- Settings page (profile management, Stripe Connect for managers)
- Dashboard with dynamic analytics per role
- Comprehensive RLS policies on all tables
- In-app notifications system with database triggers
- Real-time updates via Supabase Realtime
- Mobile responsive design (all pages)
- Email notifications via Edge Functions (payment confirmations, maintenance updates)
- Offline support via PWA service worker (vite-plugin-pwa)

### Edge Functions
- `create-checkout-session` - Creates Stripe Checkout session
- `stripe-webhook` - Handles Stripe events, sends payment confirmation emails
- `generate-receipt` - Generates payment receipts
- `send-notification-email` - Email notifications via Resend API
- `database-webhook` - Handles database trigger events for auto-notifications

### Database Webhooks (Auto Email Notifications)

Database triggers automatically send emails via pg_net + Edge Functions:
- `maintenance_request_created_webhook` - Notifies landlord of new maintenance requests
- `maintenance_request_updated_webhook` - Notifies tenant of status changes
- `tenant_assigned_webhook` - Sends welcome email when tenant assigned to unit

Configuration: Run SQL in Supabase Dashboard to set `service_role_key` in `webhook_config` table.

### PWA Features
- Service worker with workbox caching strategies
- Offline indicator component
- App manifest for installability
- Caching for API calls, images, fonts, and static resources

## Specialized Agents

### Supabase Backend Specialist (`.claude/agents/supabase-backend-specialist.md`)

Opus 4.5-powered agent for backend work. Invoke via Task tool with `subagent_type: "backend-verification-engineer"` or use the custom agent.

**Capabilities:**
- Always queries Context7 MCP for current Supabase docs before acting
- Aware this codebase may use outdated patterns
- Has project keys configured (publishable + secret)
- Uses Supabase MCP for direct database/function operations
- Checks for deprecated env variable formats and secrets

**Project Keys (New Format):**
- Publishable: `sb_publishable_owuOC4Yo2WPg4A_NurMTPw_rb-G6iM9`
- Secret: `sb_secret_YhgTBI19gjgAgw_1-Oz01w_RJveefbS`

**When to Use:**
- Auditing RLS policies or schema
- Debugging Supabase integration issues
- Updating outdated patterns to current standards
- Deploying or fixing Edge Functions
- Security reviews
