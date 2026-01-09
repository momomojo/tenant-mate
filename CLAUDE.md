# Tenant-Mate - Property Management Platform

## Project Overview

Tenant-Mate is a modern property management application built with React, Supabase, and Stripe Connect. It enables landlords to manage properties, units, tenants, leases, and collect rent payments online.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **State**: TanStack React Query v5
- **Payments**: Stripe Connect + Stripe Elements
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
src/
├── components/
│   ├── dashboard/      # Dashboard widgets (StatCard, PaymentAlerts)
│   ├── navigation/     # Sidebar navigation
│   ├── payment/        # Payment components (PaymentForm, StripeConnect, Receipt)
│   ├── property/       # Property management (Units, Documents, Tenants)
│   ├── sidebar/        # Sidebar components
│   ├── tenant/         # Tenant views (PaymentHistory, LeaseHistory, Maintenance)
│   └── ui/             # shadcn/ui components
├── hooks/
│   ├── useAuthenticatedUser.ts  # Auth hook
│   └── useStripeConnect.ts      # Stripe Connect hook
├── integrations/
│   └── supabase/
│       ├── client.ts   # Supabase client
│       └── types.ts    # Auto-generated types from DB
├── pages/
│   ├── Auth.tsx        # Login/Signup
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Documents.tsx   # Document management
│   ├── Properties.tsx  # Property list
│   ├── PropertyDetail.tsx
│   ├── Tenants.tsx     # Tenant list
│   ├── TenantDetail.tsx
│   ├── Maintenance.tsx # Maintenance requests
│   ├── Payments.tsx    # Payment management
│   └── StripeOnboarding.tsx
└── lib/
    └── utils.ts        # Utility functions

supabase/
├── config.toml         # Supabase config
├── functions/
│   ├── create-checkout-session/  # Stripe checkout
│   ├── generate-receipt/         # Receipt PDF generation
│   └── stripe-webhook/           # Webhook handler
└── migrations/
    └── *.sql           # Database migrations
```

## Database Schema (Supabase PostgreSQL)

Key tables:

- `profiles` - User profiles linked to auth.users
- `properties` - Property details
- `units` - Rental units within properties
- `tenants` - Tenant information
- `leases` - Lease agreements
- `payments` - Payment records
- `maintenance_requests` - Work orders
- `documents` - File attachments
- `stripe_accounts` - Stripe Connect accounts
- `payment_methods` - Saved payment methods
- `recurring_payments` - Autopay settings

## Key Commands

```bash
# Development
npm run dev           # Start dev server (port 8080)
npm run build         # Production build
npm run lint          # ESLint

# Supabase
supabase start        # Local Supabase
supabase db push      # Push migrations
supabase functions serve  # Local Edge Functions
```

## Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

Edge Functions require:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Current Status: ~50-55% Complete

### Completed Features

- User authentication (signup, login, logout)
- Property CRUD operations
- Unit management
- Tenant management
- Lease management
- Stripe Connect onboarding
- Payment processing with Stripe
- Receipt generation
- Basic maintenance requests
- Document upload structure

### In Progress / Needs Work

- [ ] Testing infrastructure (HIGH PRIORITY - port from Rent-Stream)
- [ ] Report services (Income Statement, Expense Report, Rent Roll)
- [ ] Notifications system
- [ ] Dashboard analytics
- [ ] Offline support
- [ ] Email notifications
- [ ] Tenant portal improvements

## Active Feature Branches

1. `feature/testing-infrastructure` - Cypress + Vitest tests
2. `feature/report-services` - Financial reports
3. `feature/offline-support` - Service worker + offline

## Development Guidelines

- Use TanStack Query for all server state
- Auto-generated types from Supabase - regenerate with `supabase gen types`
- Follow shadcn/ui patterns for new components
- All API calls should use the Supabase client
- Edge Functions for sensitive operations (Stripe)

## Stripe Connect Flow

1. Landlord signs up → `stripe_accounts` record created
2. Landlord completes onboarding → `StripeOnboarding.tsx`
3. Tenant makes payment → `create-checkout-session` Edge Function
4. Payment completed → `stripe-webhook` processes event
5. Receipt generated → `generate-receipt` Edge Function
