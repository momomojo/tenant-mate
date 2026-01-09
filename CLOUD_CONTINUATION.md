# Cloud Continuation Instructions

## Quick Context

You are continuing development on **Tenant-Mate**, a property management app chosen as the BEST foundation from 4 iterations. It has the most infrastructure built out (Supabase + Stripe Connect).

## Repository

- **GitHub**: https://github.com/momomojo/tenant-mate
- **Local Path**: `D:\Projects-newgen\Tenant-mate`

## Active Branches (Ready for Parallel Work)

### 1. `feature/testing-infrastructure` - HIGH PRIORITY

**Goal**: Port testing setup from Rent-Stream repo

**Tasks**:

```bash
git checkout feature/testing-infrastructure
```

- [ ] Install Vitest + Cypress
- [ ] Copy test utilities from `D:\projects main\Rent-Stream\src/__tests__`
- [ ] Adapt tests for Supabase (was Firebase)
- [ ] Set up `vitest.config.ts`
- [ ] Set up `cypress.config.ts`
- [ ] Create test for auth flow
- [ ] Create test for payment flow

**Source Files** (Rent-Stream):

```
D:\projects main\Rent-Stream\src/__tests__/
D:\projects main\Rent-Stream\src/__tests__/e2e/
D:\projects main\Rent-Stream\vitest.config.ts (if exists)
D:\projects main\Rent-Stream\cypress.config.ts (if exists)
```

### 2. `feature/report-services` - HIGH PRIORITY

**Goal**: Port report services from fresh-start repo

**Tasks**:

```bash
git checkout feature/report-services
```

- [ ] Create `src/services/reports/` directory
- [ ] Port Income Statement report
- [ ] Port Expense Report
- [ ] Port Rent Roll report
- [ ] Adapt to Supabase queries (was Firebase)
- [ ] Create Reports page UI
- [ ] Add to sidebar navigation

**Source Files** (fresh-start):

```
D:\projects main\fresh-start-propmanagement\src\lib\firebase\services\reportService.ts
```

### 3. `feature/offline-support` - MEDIUM PRIORITY

**Goal**: Add offline capability from Rent-Stream patterns

**Tasks**:

```bash
git checkout feature/offline-support
```

- [ ] Install Workbox
- [ ] Create service worker (`src/sw.ts`)
- [ ] Configure Vite for SW generation
- [ ] Add offline data caching
- [ ] Add sync queue for offline actions

**Source Files** (Rent-Stream):

```
D:\projects main\Rent-Stream\src\sw.ts
D:\projects main\Rent-Stream\vite.config.ts (SW config)
```

## Quick Start Commands

```bash
# Clone (if fresh environment)
git clone https://github.com/momomojo/tenant-mate.git
cd tenant-mate

# Install dependencies
npm install

# Start dev server
npm run dev

# Switch branches
git checkout feature/testing-infrastructure
git checkout feature/report-services
git checkout feature/offline-support
```

## Key Files to Reference

### Supabase Types (auto-generated)

`src/integrations/supabase/types.ts` - All DB types

### Stripe Integration

- `src/hooks/useStripeConnect.ts`
- `src/components/payment/PaymentForm.tsx`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

### Auth

- `src/hooks/useAuthenticatedUser.ts`
- `src/pages/Auth.tsx`

## Environment Setup

Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Parallel Development Strategy

Each branch can be worked on independently:

1. **Testing** - Can be done entirely in isolation
2. **Reports** - Needs DB queries, reference `types.ts`
3. **Offline** - Service worker is standalone

When complete, merge to `main` via PR.

## Analysis Document

Full comparative analysis: `D:\projects main\COMPARATIVE_ANALYSIS.md`

## Contact / Notes

- Supabase dashboard: https://supabase.com/dashboard
- Stripe dashboard: https://dashboard.stripe.com
- 10 Dependabot vulnerabilities flagged - run `npm audit` to review
