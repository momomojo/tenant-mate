# Pages TODO

## New Pages Needed

### P0 - Critical
- [ ] `Applicants.tsx` - Leads/applicants pipeline (before they become tenants)
- [ ] `Messages.tsx` - In-app messaging between landlord ↔ tenant
- [ ] `Leases.tsx` - Lease management with templates and e-signatures
- [ ] `Screening.tsx` - Tenant screening orders and results

### P1 - High Priority
- [ ] `Expenses.tsx` - Expense tracking per property (accounting)
- [ ] `Listings.tsx` - Marketing listings for syndication

### P2 - Medium Priority
- [ ] `Inspections.tsx` - Move-in/move-out condition reports

---

## Existing Pages - Enhancements

### Properties.tsx
- [ ] Add property type selector (residential/commercial/mixed-use)
- [ ] Add property image upload
- [ ] Show different icons based on property type
- [ ] Add "Invite to Apply" button

### PropertyDetails.tsx
- [ ] Add image gallery
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
- [ ] Add payment processor selection (Stripe vs Dwolla vs Adyen)
- [ ] Show processing fees comparison
- [ ] Add ACH-specific options

### Dashboard.tsx
- [ ] Add "Applicants" stat card
- [ ] Add "Pending Leases" stat card
- [ ] Add "Unread Messages" indicator
- [ ] Add expense summary widget

### Settings.tsx
- [ ] Add payment processor configuration
- [ ] Add screening provider selection
- [ ] Add e-signature provider selection
- [ ] Add notification preferences

---

## Technical Debt

- [ ] Add auth checks to remaining pages (verify all protected)
- [ ] Add loading skeletons for better UX
- [ ] Add error boundaries
- [ ] Implement code splitting for large pages
