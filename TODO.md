# TenantMate - Master TODO

**Last Updated:** January 12, 2026

This is the master TODO file. Each folder has its own TODO.md for granular tracking.

---

## Quick Reference

| Folder | TODO File | Description |
|--------|-----------|-------------|
| `/src/pages/` | [TODO.md](src/pages/TODO.md) | Page-level features |
| `/src/components/` | [TODO.md](src/components/TODO.md) | UI components |
| `/src/hooks/` | [TODO.md](src/hooks/TODO.md) | React hooks |
| `/supabase/functions/` | [TODO.md](supabase/functions/TODO.md) | Edge Functions |
| `/supabase/migrations/` | [TODO.md](supabase/migrations/TODO.md) | Database schema |
| `/docs/` | Analysis & Roadmap | Documentation |

---

## Priority Overview

### P0 - Critical (Competitive Parity)
1. ~~**Tenant Screening**~~ - Moved to `feature/tenant-screening` branch (needs real provider)
2. **In-App Messaging** - ✅ DONE (Messages page with real-time)
3. **Lease Management** - ✅ DONE (Leases page, templates, CRUD)
4. **Applicant Pipeline** - ✅ DONE (Applicants page with workflow)

### P1 - High (Customer Requested)
5. **Lower Payment Fees** - ✅ Dwolla Edge Functions created + Payment settings UI (deploy when ready)
6. **Commercial Property Support** - ✅ DONE (Property type selector with icons)
7. **Property Images** - ✅ DONE (PropertyImageUpload component)

### P2 - Medium (Nice to Have)
8. **Expense Tracking** - ✅ DONE (Expenses page with CRUD, categories, summaries)
9. **Condition Reports** - ✅ DONE (Inspections page with move-in/move-out tracking)
10. **Marketing Syndication** - Not started

---

## Feature Branches

| Branch | Feature | Status |
|--------|---------|--------|
| `feature/tenant-screening` | Tenant background/credit checks | Ready when provider selected |

---

## Documentation

- [Competitive Analysis](docs/COMPETITIVE_ANALYSIS.md) - TurboTenant vs RentSpree comparison
- [Feature Roadmap](docs/FEATURE_ROADMAP.md) - Detailed implementation plan
- [CLAUDE.md](CLAUDE.md) - Development guidelines

---

## What's Left To Do

### Future Features
- [ ] Marketing syndication (Zillow, Apartments.com)
- [ ] Tenant screening (TransUnion/Experian integration)

### Completed (January 2026)
- [x] Dwolla ACH payments - Edge Functions deployed, UI wired up in Settings
- [x] E-Signatures - Dropbox Sign integrated (send-request, get-sign-url, webhook Edge Functions)

---

## Completed (January 2026)

### Backend & Infrastructure
- [x] Backend audit - Security fixes, Edge Functions
- [x] Auth checks on all protected pages
- [x] PWA support with offline indicator
- [x] Testing infrastructure (Vitest)
- [x] Email notifications via database webhooks
- [x] Database migrations for messaging, applicants, leases, property images, expenses, inspections

### New Pages
- [x] Messages.tsx - Real-time messaging with conversations
- [x] Applicants.tsx - Full pipeline with invite, screening, approve/reject
- [x] Leases.tsx - CRUD with status management
- [x] Expenses.tsx - Expense tracking with categories and summaries
- [x] Inspections.tsx - Move-in/move-out condition reports

### UI Enhancements (January 12, 2026)
- [x] Property type selector on Properties page (residential/commercial/mixed_use/industrial)
- [x] Dashboard stat cards for Applicants and Leases (property_manager and admin roles)
- [x] Convert Applicant → Tenant flow (ConvertApplicantDialog with unit assignment and lease creation)
- [x] Payment processor settings in Settings page (Stripe vs Dwolla with fee comparison)

### New Components
- [x] PropertyImageUpload - Drag-drop with primary selection
- [x] LeaseCard, CreateLeaseDialog, LeaseFilters
- [x] ApplicantCard, InviteApplicantDialog, ApplicantFilters
- [x] ConversationList, MessageThread, NewConversationDialog
- [x] ConvertApplicantDialog - Converts approved applicants to tenants

### New Hooks
- [x] useLeases, useLeaseTemplates
- [x] useProperties, useUnits
- [x] usePropertyImages
- [x] useConversations, useMessages
- [x] useApplicants
- [x] useExpenses - Expense CRUD with category summaries
- [x] useInspections - Inspection CRUD with status management

---

## Notes

### Third-Party APIs Integrated
- ✅ Dropbox Sign (e-signatures) - Embedded signing for leases
- ✅ Dwolla (ACH payments) - Low-fee bank transfers ($0.25/transaction)
- ✅ Stripe Connect - Credit/debit card payments

### Third-Party APIs Needed (Future)
- TransUnion or Experian (screening) - for `feature/tenant-screening`
- Zillow API (marketing syndication) - future feature
