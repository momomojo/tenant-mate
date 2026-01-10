# TenantMate Feature Roadmap

**Created:** January 10, 2026
**Last Updated:** January 10, 2026

---

## Priority Tiers

### P0 - Critical (Revenue & Competitive Parity)
These features are essential for competing with TurboTenant/RentSpree.

### P1 - High (Customer Requested)
Based on direct customer feedback.

### P2 - Medium (Nice to Have)
Improvements that enhance the product.

### P3 - Low (Future Consideration)
Long-term enhancements.

---

## P0 - Critical Features

### 1. Tenant Screening Integration
**Why:** Industry standard. Revenue opportunity ($35-45 per screening).
**Competitor:** TurboTenant ($35-55), RentSpree ($39.99)
**Implementation:**
- Integrate with TransUnion or Experian API
- Applicant pays screening fee
- Credit report, background check, eviction history
- Results displayed in-app

**Database Changes:**
- `applicants` table (leads before becoming tenants)
- `screening_reports` table
- `screening_orders` table

**Effort:** 2-3 weeks
**Revenue:** $35-45 per screening (landlord can absorb or pass to applicant)

---

### 2. In-App Messaging
**Why:** Customer specifically praised TurboTenant's messaging.
**Features:**
- Real-time chat between landlord ↔ tenant
- Message history
- Periodic check-ins ("How are things going?" with emoji responses)
- Push notifications
- Read receipts

**Database Changes:**
- `conversations` table
- `messages` table
- `check_ins` table (periodic tenant satisfaction)

**Effort:** 2 weeks

---

### 3. Lease Management & E-Signatures
**Why:** Complete workflow from applicant → signed lease → tenant
**Features:**
- Lease template builder
- State-specific templates (start with top 10 states)
- E-signature integration (DocuSign, HelloSign, or built-in)
- Lease status tracking (draft, sent, signed)
- Document storage after signing

**Database Changes:**
- `lease_templates` table
- `leases` table (with status, signatures)
- `lease_documents` table

**Effort:** 3-4 weeks

---

### 4. Applicant/Leads Pipeline
**Why:** TurboTenant has Leads → Applicants → Tenants flow
**Features:**
- "Invite to Apply" feature
- Application form (customizable)
- Application status tracking
- Convert approved applicant to tenant

**Database Changes:**
- `applications` table
- `application_forms` table

**Effort:** 1-2 weeks

---

## P1 - High Priority (Customer Requested)

### 5. Lower Payment Processing Fees
**Why:** Customer specifically asked about alternatives to Stripe
**Options:**
- Add Dwolla integration ($0.25/ACH)
- Add Adyen integration ($0.40/ACH)
- Keep Stripe as fallback for cards
- Let landlords choose payment processor

**Effort:** 2 weeks

---

### 6. Commercial Property Support
**Why:** "Both advertise commercial but show properties as homes"
**Features:**
- Property type field (residential, commercial, mixed-use)
- Different icons for property types
- Commercial-specific fields (CAM charges, NNN)

**Database Changes:**
- Add `property_type` enum to `properties` table

**Effort:** 1 week

---

### 7. Property Images
**Why:** Competitors show property photos, we show generic icons
**Features:**
- Upload property photos
- Gallery view
- Thumbnail on property cards

**Database Changes:**
- `property_images` table (or use Supabase Storage)

**Effort:** 1 week

---

## P2 - Medium Priority

### 8. Expense Tracking / Accounting
**Features:**
- Record expenses per property
- Categories (repairs, utilities, insurance, etc.)
- Tax report generation
- Income vs expense dashboard

**Database Changes:**
- `expenses` table
- `expense_categories` table

**Effort:** 2 weeks

---

### 9. Condition Reports
**Features:**
- Move-in/move-out inspections
- Photo documentation
- Checklist templates
- Comparison reports

**Effort:** 2 weeks

---

### 10. Marketing & Listing Syndication
**Features:**
- Create rental listings
- Syndicate to Zillow, Apartments.com, etc.
- Track listing views and inquiries

**Effort:** 3-4 weeks (API integrations)

---

## P3 - Future Consideration

### 11. Native Mobile App
**Current:** PWA with offline support
**Future:** React Native app for iOS/Android

### 12. AI-Powered Features
- Rent price suggestions based on market data
- Maintenance request categorization
- Lease clause recommendations

### 13. Vendor Management
- Contractor database
- Work order assignment
- Invoice tracking

---

## Implementation Timeline (Suggested)

### Phase 1: Foundation (Weeks 1-4)
- [ ] Commercial property support (P1)
- [ ] Property images (P1)
- [ ] Applicant/Leads pipeline (P0)

### Phase 2: Core Features (Weeks 5-10)
- [ ] In-App Messaging (P0)
- [ ] Tenant Screening integration (P0)

### Phase 3: Complete Workflow (Weeks 11-16)
- [ ] Lease Management & E-Signatures (P0)
- [ ] Lower payment fees integration (P1)

### Phase 4: Enhancements (Weeks 17+)
- [ ] Expense Tracking (P2)
- [ ] Condition Reports (P2)
- [ ] Marketing Syndication (P2)

---

## Quick Wins (< 1 day each)

1. Add property type field to database and UI
2. Update property icons based on type
3. Add property image upload to existing storage
4. Create applicants table structure
5. Add "Invite to Apply" button to properties

---

## Technical Debt to Address

1. Bundle size optimization (866KB - needs code splitting)
2. Add more comprehensive tests
3. Document API endpoints
4. Add Storybook for component documentation
