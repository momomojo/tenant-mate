# Database Migrations TODO

## New Tables Needed

### Applicants & Screening (P0)

```sql
-- Applicants (before they become tenants)
CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending', -- pending, screening, approved, rejected, converted
  application_data JSONB, -- flexible form data
  screening_order_id TEXT, -- external screening ID
  screening_status TEXT, -- pending, completed, failed
  screening_completed_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screening Reports
CREATE TABLE screening_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id),
  provider TEXT NOT NULL, -- transunion, experian, etc.
  credit_score INTEGER,
  credit_report JSONB,
  background_check JSONB,
  eviction_history JSONB,
  income_verification JSONB,
  recommendation TEXT, -- approve, review, deny
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Messaging (P0)

```sql
-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  landlord_id UUID REFERENCES profiles(id),
  tenant_id UUID REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-ins (periodic tenant satisfaction)
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES profiles(id),
  unit_id UUID REFERENCES units(id),
  rating TEXT, -- good, neutral, bad
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Leases (P0)

```sql
-- Lease Templates
CREATE TABLE lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT, -- for state-specific templates
  content TEXT NOT NULL, -- HTML or markdown
  variables JSONB, -- placeholders like {{tenant_name}}
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leases
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  tenant_id UUID REFERENCES profiles(id),
  template_id UUID REFERENCES lease_templates(id),
  status TEXT DEFAULT 'draft', -- draft, sent, signed, active, expired
  lease_start DATE,
  lease_end DATE,
  monthly_rent DECIMAL(10,2),
  security_deposit DECIMAL(10,2),
  content TEXT, -- final lease content
  landlord_signed_at TIMESTAMPTZ,
  tenant_signed_at TIMESTAMPTZ,
  external_signature_id TEXT, -- DocuSign/HelloSign ID
  signed_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Property Enhancements (P1)

```sql
-- Add property type
ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT 'residential';
-- Types: residential, commercial, mixed_use, industrial

-- Property Images
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  storage_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Expenses (P2)

```sql
-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  is_tax_deductible BOOLEAN DEFAULT TRUE
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  vendor TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Order

1. `20260110_add_property_type.sql` - Quick win
2. `20260110_property_images.sql` - Quick win
3. `20260111_applicants_screening.sql` - P0
4. `20260112_messaging.sql` - P0
5. `20260113_leases.sql` - P0
6. `20260114_expenses.sql` - P2

---

## RLS Policies Needed

All new tables need RLS policies:
- Applicants: Property owner can see all, applicant can see own
- Messages: Only conversation participants
- Leases: Landlord and tenant of that lease
- Expenses: Property owner only
- Screening Reports: Property owner only (sensitive data)

---

## Indexes Needed

```sql
-- Applicants
CREATE INDEX idx_applicants_property ON applicants(property_id);
CREATE INDEX idx_applicants_status ON applicants(status);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Conversations
CREATE INDEX idx_conversations_landlord ON conversations(landlord_id);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);

-- Leases
CREATE INDEX idx_leases_property ON leases(property_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);

-- Expenses
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```
