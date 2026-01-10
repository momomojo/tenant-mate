# TenantMate - Master TODO

**Last Updated:** January 10, 2026

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
1. **Tenant Screening** - $35-45/screening revenue
2. **In-App Messaging** - Customer's #1 requested feature
3. **Lease Management & E-Signatures** - Complete workflow
4. **Applicant Pipeline** - Leads → Applicants → Tenants

### P1 - High (Customer Requested)
5. **Lower Payment Fees** - Dwolla/Adyen vs Stripe
6. **Commercial Property Support** - Icons and fields
7. **Property Images** - Photo galleries

### P2 - Medium (Nice to Have)
8. **Expense Tracking** - Accounting features
9. **Condition Reports** - Move-in/out inspections
10. **Marketing Syndication** - Zillow, Apartments.com

---

## Documentation

- [Competitive Analysis](docs/COMPETITIVE_ANALYSIS.md) - TurboTenant vs RentSpree comparison
- [Feature Roadmap](docs/FEATURE_ROADMAP.md) - Detailed implementation plan
- [CLAUDE.md](CLAUDE.md) - Development guidelines

---

## Current Sprint

### In Progress
- [ ] None currently

### Up Next
- [ ] Add property_type to properties table
- [ ] Add property images support
- [ ] Create applicants table

---

## Completed (January 2026)

- [x] Backend audit - Security fixes, Edge Functions
- [x] Auth checks on all protected pages
- [x] PWA support with offline indicator
- [x] Testing infrastructure (Vitest)
- [x] Live dashboard stats
- [x] Mobile responsive improvements
- [x] Email notifications via database webhooks

---

## Notes

### Competitor Credentials
**IMPORTANT:** Do NOT store competitor login credentials in this codebase.
Using competitor credentials would violate their Terms of Service.
All competitive research should use publicly available information.

### Third-Party APIs Needed
See `/supabase/functions/TODO.md` for required API keys:
- TransUnion or Experian (screening)
- DocuSign or HelloSign (e-signatures)
- Dwolla or Adyen (lower payment fees)
- Zillow API (marketing syndication)
