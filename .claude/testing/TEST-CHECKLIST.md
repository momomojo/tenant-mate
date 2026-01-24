# TenantMate E2E Test Checklist

> Automated UI testing via `agent-browser` skill. Check off features as they pass.
> Re-run failing tests after fixes. Update this file programmatically.

## How to Use
1. Open this file to see current test status
2. Use `agent-browser` to test each feature interactively
3. Mark items `[x]` when passing, add notes for failures
4. Fix bugs found during testing, then re-test

---

## Landing Page
- [x] Hero section renders (title, subtitle, CTA buttons)
- [x] "Get Started Free" navigates to `/auth?mode=signup`
- [x] "Sign In" navigates to `/auth`
- [x] Feature cards section (6 cards: Smart Messaging, Maintenance, Payments, Documents, Inspections, Analytics)
- [x] Footer renders
- [x] Mobile responsive layout

## Authentication
- [x] Sign In form (email, password, submit)
- [x] Sign Up form (first name, last name, role, email, password)
- [x] Role selector defaults to "Tenant"
- [x] Role selector has Tenant, Property Manager, Admin options
- [x] Tenant signup → auto-login → redirect to `/dashboard`
- [x] Property Manager signup → auto-login → redirect to `/dashboard`
- [x] Sign in with existing account
- [ ] Invalid credentials show error toast
- [ ] Empty form validation
- [ ] Password minimum length enforcement
- [x] Sign out clears session and redirects to `/auth`

## Tenant Dashboard
- [x] Title: "My Dashboard"
- [x] MY UNITS card (shows unit or "No units assigned")
- [x] RENT DUE card
- [x] MAINTENANCE card (active request count)
- [x] DOCUMENTS card
- [x] Payment Alerts section
- [x] Sidebar shows: Dashboard, Maintenance, Messages, Documents, Payments, Settings
- [x] Sidebar does NOT show: Properties, Tenants, Applicants, Reports, Expenses, Inspections

## Property Manager Dashboard
- [x] Title: "Property Manager Dashboard"
- [x] TOTAL PROPERTIES card
- [x] TOTAL UNITS card (with occupancy %)
- [x] APPLICANTS card
- [x] LEASES card
- [x] ACTIVE TENANTS card
- [x] MAINTENANCE card
- [x] Full sidebar navigation (all 12 items)

## Properties (Manager)
- [x] Properties list page with search bar
- [x] "Add Property" button opens dialog
- [x] Add Property dialog: name, address, type selector
- [x] Property card shows name, address, type badge, unit count, occupancy
- [x] Click property card → property detail page
- [ ] Edit property (name, address, type)
- [ ] Delete property
- [x] Search filters properties by name

## Property Details (Manager)
- [x] Header with property name, address, back button
- [x] Units Overview card (total units, occupied units)
- [x] Property Images section (drag-drop upload area)
- [x] Units table (Unit Number, Status, Monthly Rent, Current Tenant, Actions)
- [x] "Add Unit" button opens dialog
- [x] Add Unit dialog (unit number, monthly rent)
- [x] Unit shows "vacant" badge and "No Tenant" when empty
- [x] "Assign Tenant" button on vacant units
- [ ] Upload property image
- [ ] Delete property image
- [ ] "Manage" button opens unit edit dialog
- [x] Assign tenant to unit flow
- [x] Unit status changes to "occupied" after assignment
- [ ] Edit unit (number, rent)
- [ ] Delete unit

## Tenants (Manager)
- [x] Tenants list page with table (Tenant, Contact, Current Unit, Actions)
- [x] Shows assigned tenants with unit info
- [ ] Click tenant → tenant detail page
- [ ] Add tenant manually
- [ ] Remove tenant from unit

## Applicants (Manager)
- [x] Status summary cards (Total, Pending, Screening, Approved, Rejected)
- [x] Search bar with property and status filters
- [x] Status tabs (All, Pending, Screening, Approved, Rejected)
- [x] "Invite Applicant" button
- [x] Invite applicant flow (email, property, unit)
- [x] Applicant card shows name, email, property, status
- [ ] Status change workflow (pending → screening → approved/rejected)
- [ ] Convert approved applicant to tenant
- [ ] ConvertApplicantDialog multi-step flow

## Leases (Manager)
- [x] Status summary cards (Total, Drafts, Pending, Active, Expired)
- [x] Property and status filters
- [x] Status tabs (All, Drafts, Pending, Active, Expired)
- [x] "Create Lease" button
- [x] Create lease form (tenant, unit, dates, rent, terms)
- [x] Lease card shows details
- [ ] Lease status transitions
- [ ] View lease details

## Maintenance
- [x] Tenant view: "No maintenance requests yet" empty state
- [x] Manager view: maintenance list
- [x] Tenant: create new maintenance request (title, description, priority, unit)
- [x] Tenant: view own requests with status
- [x] Manager: view all requests
- [x] Manager: change request status (pending → in_progress → completed)
- [x] Manager: assign priority (set during request creation)
- [x] Request shows timestamp, unit, property info

## Messages
- [x] Two-panel layout (conversation list + messages)
- [x] Empty state: "No conversations yet"
- [x] Start new conversation
- [x] Send message
- [x] Receive message (real-time)
- [x] Message shows timestamp and sender
- [x] Conversation list updates with latest message

## Documents
- [x] Tenant view: "My Property Documents" section
- [x] Manager view: Documents page
- [ ] Upload document
- [ ] View/download document
- [ ] Delete document
- [ ] Document categorization

## Payments
- [x] Tenant view: search, status filter, date filter
- [x] Empty state: "No payments found"
- [ ] Manager: payment list with all tenant payments
- [ ] Manager: Stripe Connect onboarding
- [ ] Tenant: make payment (Stripe Checkout flow)
- [ ] Payment status tracking (pending → completed)
- [ ] Payment receipt generation
- [ ] Payment history filtering

## Expenses (Manager)
- [x] Total summary card
- [x] Filters: property, category, search
- [x] "Add Expense" button
- [x] Empty state: "No expenses found"
- [x] Add expense form (property, category, amount, date, description)
- [x] Expense table shows all fields
- [ ] Edit expense
- [ ] Delete expense
- [ ] Filter by property
- [ ] Filter by category (13 categories)
- [ ] Tax deductible flag
- [ ] Receipt upload

## Inspections (Manager)
- [x] Status cards (Total, Scheduled, In Progress, Completed)
- [x] Filters: property, type, status
- [x] "Schedule Inspection" button
- [x] Empty state
- [x] Schedule inspection form (property, unit, type, date)
- [x] Inspection types: move_in, move_out, routine, maintenance, annual
- [ ] Inspection card shows details
- [ ] Status transitions (scheduled → in_progress → completed)
- [ ] Add inspection items
- [ ] Add inspection photos
- [ ] View inspection report

## Reports (Manager)
- [x] Summary cards (Properties, Units, Potential Income, Current Income)
- [x] Rent Roll tab with property/unit data
- [x] Income Report tab
- [x] Property Summary tab
- [x] Data accuracy (matches real database state: 1 property, 1 unit, $1,500 potential, $0 current)

## Settings
- [x] Profile Information form (first name, last name, email, phone, address)
- [x] Email field read-only ("cannot be changed")
- [x] First/last name pre-filled from signup
- [x] Manager: Account Information section (Account Type, Member Since)
- [x] Manager: Payment Settings section (Stripe Connect + Dwolla tabs)
- [x] Manager: E-Signature section (Dropbox Sign integration)
- [x] Save profile changes (phone number persists after reload)
- [ ] Phone number formatting
- [ ] Address fields save correctly
- [ ] Manager: Stripe Connect onboarding button

## Notifications
- [x] Bell icon in header
- [x] Notification count badge
- [x] Notification dropdown/panel
- [x] Mark as read (individual + mark all)
- [x] Real-time notifications (maintenance request triggers notification)

## Mobile Responsiveness
- [x] Landing page on mobile viewport
- [x] Auth page on mobile viewport
- [x] Dashboard on mobile viewport
- [x] Sidebar collapses on mobile (hamburger toggle)
- [x] Tables scroll horizontally on mobile (overflow: auto)
- [x] Forms are usable on mobile (inputs visible and accessible)

## Error Handling
- [x] 404 page for invalid routes (shows "This page doesn't exist" with Back to Home)
- [x] Unauthorized redirect to /auth (protected routes redirect correctly)
- [ ] Network error handling (toast messages)
- [ ] Form validation errors display correctly

---

## Test Statistics
- **Total items**: 130+
- **Passing**: ~101
- **Failing**: 0
- **Untested**: ~29
- **Last run**: 2026-01-24 (session 4 - messaging, maintenance, notifications, mobile)

## Bugs Found & Fixed
| # | Description | File | Status |
|---|-------------|------|--------|
| 1 | `formatTenantLabel` crashes on null tenant | `src/types/index.ts:88` | Fixed |
| 2 | Expense total ($0) not updating after create | `src/hooks/useExpenses.ts` | Fixed - added `expenseSummary` invalidation |
| 3 | Inspection count cards show 0 after create | `src/hooks/useInspections.ts` | Fixed - added `inspectionCounts` invalidation |
| 4 | Applicant count cards stale after mutations | `src/hooks/useApplicants.ts` | Fixed - added `applicant-counts` invalidation |
| 5 | Lease count cards stale after mutations | `src/hooks/useLeases.ts` | Fixed - added `lease-counts` invalidation |
| 6 | PostgREST `.or()` 400 error with foreign table refs | `useLeases, useApplicants, Dashboard` | Fixed - use `{ referencedTable: 'property' }` option |
| 7 | Vercel 404 on direct SPA route access | `vercel.json` (new) | Fixed - added catch-all rewrite to `/index.html` |
| 8 | Messaging queries select non-existent `avatar_url` column | `useConversations.ts, useMessages.ts` | Fixed - removed `avatar_url` from all selects |
| 9 | Documents page hides upload UI when no documents exist | `src/pages/Documents.tsx:103` | Known - early return prevents PM upload rendering |
