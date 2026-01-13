# Pages TODO

## New Pages Needed

### P0 - Critical
- [x] `Applicants.tsx` - Leads/applicants pipeline (before they become tenants) ✅ DONE
- [x] `Messages.tsx` - In-app messaging between landlord ↔ tenant ✅ DONE
- [x] `Leases.tsx` - Lease management with templates ✅ DONE
- [ ] `Screening.tsx` - Tenant screening orders and results (needs real provider - see feature/tenant-screening branch)

### P1 - High Priority
- [ ] `Expenses.tsx` - Expense tracking per property (accounting)
- [ ] `Listings.tsx` - Marketing listings for syndication

### P2 - Medium Priority
- [ ] `Inspections.tsx` - Move-in/move-out condition reports

---

## Existing Pages - Enhancements

### Properties.tsx
- [ ] Add property type selector (residential/commercial/mixed-use)
- [x] Add property image upload ✅ DONE (in PropertyDetails)
- [ ] Show different icons based on property type
- [ ] Add "Invite to Apply" button

### PropertyDetails.tsx
- [x] Add image gallery ✅ DONE (PropertyImageUpload component)
- [ ] Add lease status indicator
- [ ] Add applicants section
- [ ] Add expense summary

### Tenants.tsx
- [ ] Add conversion from Applicants
- [ ] Add lease attachment status
- [ ] Add screening report link

### TenantProfile.tsx
- [ ] Add communication history (messages)
- [ ] Add screening report view
- [ ] Add lease documents section

### Payments.tsx
- [ ] Add payment processor selection (Stripe vs Dwolla)
- [ ] Show processing fees comparison
- [ ] Add ACH-specific options
- Note: Dwolla Edge Functions created - see supabase/functions/dwolla-*

### Dashboard.tsx
- [ ] Add "Applicants" stat card
- [ ] Add "Pending Leases" stat card
- [x] Add "Unread Messages" indicator (Messages in sidebar)
- [ ] Add expense summary widget

### Settings.tsx
- [ ] Add payment processor configuration
- [ ] Add screening provider selection
- [ ] Add e-signature provider selection
- [ ] Add notification preferences

---

## Technical Debt

- [x] Add auth checks to remaining pages ✅ DONE
- [ ] Add loading skeletons for better UX
- [ ] Add error boundaries
- [ ] Implement code splitting for large pages
