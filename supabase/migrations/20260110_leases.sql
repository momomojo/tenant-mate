-- Leases Migration
-- Created: January 10, 2026
-- Purpose: Lease management with e-signature support

-- ============================================
-- LEASE TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  state TEXT,                          -- For state-specific templates (e.g., 'CA', 'TX')

  -- Template content (HTML with variable placeholders)
  content TEXT NOT NULL,

  -- Available variables for this template
  variables JSONB DEFAULT '[
    {"key": "tenant_name", "label": "Tenant Full Name", "type": "text"},
    {"key": "landlord_name", "label": "Landlord Full Name", "type": "text"},
    {"key": "property_address", "label": "Property Address", "type": "text"},
    {"key": "unit_number", "label": "Unit Number", "type": "text"},
    {"key": "monthly_rent", "label": "Monthly Rent", "type": "currency"},
    {"key": "security_deposit", "label": "Security Deposit", "type": "currency"},
    {"key": "lease_start_date", "label": "Lease Start Date", "type": "date"},
    {"key": "lease_end_date", "label": "Lease End Date", "type": "date"},
    {"key": "late_fee", "label": "Late Fee Amount", "type": "currency"},
    {"key": "grace_period_days", "label": "Grace Period (Days)", "type": "number"}
  ]'::jsonb,

  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES lease_templates(id) ON DELETE SET NULL,

  -- Lease status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Being created/edited
    'pending',      -- Sent for signature
    'signed',       -- All parties signed
    'active',       -- Currently active
    'expired',      -- Past end date
    'terminated',   -- Early termination
    'renewed'       -- Replaced by new lease
  )),

  -- Lease terms
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2) DEFAULT 0,

  -- Additional terms
  late_fee DECIMAL(10,2) DEFAULT 50.00,
  grace_period_days INTEGER DEFAULT 5,
  pet_deposit DECIMAL(10,2) DEFAULT 0,
  pet_rent DECIMAL(10,2) DEFAULT 0,

  -- Populated content (from template + variables)
  content TEXT,

  -- E-Signature info
  signature_provider TEXT,             -- docusign, hellosign, etc.
  signature_request_id TEXT,           -- External signature request ID
  signature_status TEXT CHECK (signature_status IN (
    'not_sent',
    'sent',
    'viewed',
    'partially_signed',
    'completed',
    'declined',
    'expired'
  )) DEFAULT 'not_sent',

  -- Signature timestamps
  landlord_signed_at TIMESTAMPTZ,
  landlord_signature_ip TEXT,
  tenant_signed_at TIMESTAMPTZ,
  tenant_signature_ip TEXT,

  -- Signed document
  signed_document_url TEXT,
  signed_document_path TEXT,           -- Supabase Storage path

  -- Renewal info
  renewed_from_lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  renewed_to_lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,

  -- Termination info
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  termination_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEASE DOCUMENTS TABLE (Attachments)
-- ============================================
CREATE TABLE IF NOT EXISTS lease_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  document_type TEXT DEFAULT 'attachment', -- attachment, addendum, rider, exhibit
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- If this is a signed addendum
  requires_signature BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,

  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_lease_templates_state ON lease_templates(state);
CREATE INDEX idx_lease_templates_active ON lease_templates(is_active);

CREATE INDEX idx_leases_property ON leases(property_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_dates ON leases(lease_start, lease_end);
CREATE INDEX idx_leases_active ON leases(status) WHERE status = 'active';

CREATE INDEX idx_lease_documents_lease ON lease_documents(lease_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE lease_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;

-- Lease Templates: Property owners can manage, all users can view defaults
CREATE POLICY "Users can view lease templates"
  ON lease_templates FOR SELECT
  USING (
    is_default = TRUE OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.created_by = auth.uid() OR p.property_manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their templates"
  ON lease_templates FOR ALL
  USING (created_by = auth.uid());

-- Leases: Landlord and tenant can view
CREATE POLICY "Lease participants can view leases"
  ON leases FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = leases.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can create leases"
  ON leases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can update leases"
  ON leases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = leases.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can delete draft leases"
  ON leases FOR DELETE
  USING (
    status = 'draft' AND
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = leases.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Lease Documents: Same as leases
CREATE POLICY "Lease participants can view documents"
  ON lease_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      WHERE l.id = lease_documents.lease_id
      AND (
        l.tenant_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM properties p
          WHERE p.id = l.property_id
          AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Property owners can manage lease documents"
  ON lease_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      JOIN properties p ON p.id = l.property_id
      WHERE l.id = lease_documents.lease_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check and update lease status based on dates
CREATE OR REPLACE FUNCTION update_lease_status()
RETURNS void AS $$
BEGIN
  -- Activate signed leases that have started
  UPDATE leases SET
    status = 'active',
    updated_at = NOW()
  WHERE status = 'signed'
  AND lease_start <= CURRENT_DATE
  AND lease_end >= CURRENT_DATE;

  -- Expire active leases that have ended
  UPDATE leases SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
  AND lease_end < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to populate lease content from template
CREATE OR REPLACE FUNCTION populate_lease_content(
  p_lease_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_lease RECORD;
  v_template RECORD;
  v_tenant RECORD;
  v_property RECORD;
  v_unit RECORD;
  v_landlord RECORD;
  v_content TEXT;
BEGIN
  -- Get lease details
  SELECT * INTO v_lease FROM leases WHERE id = p_lease_id;
  SELECT * INTO v_template FROM lease_templates WHERE id = v_lease.template_id;
  SELECT * INTO v_tenant FROM profiles WHERE id = v_lease.tenant_id;
  SELECT * INTO v_property FROM properties WHERE id = v_lease.property_id;
  SELECT * INTO v_unit FROM units WHERE id = v_lease.unit_id;
  SELECT * INTO v_landlord FROM profiles WHERE id = v_property.created_by;

  v_content := v_template.content;

  -- Replace variables
  v_content := REPLACE(v_content, '{{tenant_name}}', COALESCE(v_tenant.first_name || ' ' || v_tenant.last_name, ''));
  v_content := REPLACE(v_content, '{{landlord_name}}', COALESCE(v_landlord.first_name || ' ' || v_landlord.last_name, ''));
  v_content := REPLACE(v_content, '{{property_address}}', COALESCE(v_property.address, ''));
  v_content := REPLACE(v_content, '{{unit_number}}', COALESCE(v_unit.unit_number, ''));
  v_content := REPLACE(v_content, '{{monthly_rent}}', v_lease.monthly_rent::TEXT);
  v_content := REPLACE(v_content, '{{security_deposit}}', v_lease.security_deposit::TEXT);
  v_content := REPLACE(v_content, '{{lease_start_date}}', v_lease.lease_start::TEXT);
  v_content := REPLACE(v_content, '{{lease_end_date}}', v_lease.lease_end::TEXT);
  v_content := REPLACE(v_content, '{{late_fee}}', v_lease.late_fee::TEXT);
  v_content := REPLACE(v_content, '{{grace_period_days}}', v_lease.grace_period_days::TEXT);

  -- Update lease with populated content
  UPDATE leases SET content = v_content, updated_at = NOW() WHERE id = p_lease_id;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_lease_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lease_timestamp
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_timestamp();

CREATE TRIGGER trigger_update_lease_template_timestamp
  BEFORE UPDATE ON lease_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_timestamp();

-- ============================================
-- STORAGE BUCKET FOR LEASE DOCUMENTS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-documents', 'lease-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lease documents (private)
CREATE POLICY "Lease participants can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lease-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Property owners can upload lease documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lease-documents' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- INSERT DEFAULT LEASE TEMPLATE
-- ============================================
INSERT INTO lease_templates (id, name, description, is_default, content)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Standard Residential Lease Agreement',
  'A basic month-to-month or fixed-term residential lease agreement',
  TRUE,
  '
<h1>RESIDENTIAL LEASE AGREEMENT</h1>

<p>This Residential Lease Agreement ("Agreement") is entered into as of {{lease_start_date}}, by and between:</p>

<h2>PARTIES</h2>
<p><strong>LANDLORD:</strong> {{landlord_name}}</p>
<p><strong>TENANT:</strong> {{tenant_name}}</p>

<h2>PROPERTY</h2>
<p>The Landlord agrees to rent to the Tenant the property located at:</p>
<p>{{property_address}}, Unit {{unit_number}}</p>

<h2>TERM</h2>
<p>This lease shall commence on {{lease_start_date}} and shall terminate on {{lease_end_date}}.</p>

<h2>RENT</h2>
<p>The Tenant agrees to pay monthly rent of ${{monthly_rent}}, due on the 1st of each month.</p>
<p>A late fee of ${{late_fee}} will be charged if rent is not received within {{grace_period_days}} days of the due date.</p>

<h2>SECURITY DEPOSIT</h2>
<p>Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of ${{security_deposit}} as a security deposit.</p>

<h2>UTILITIES</h2>
<p>Tenant shall be responsible for payment of all utilities and services, except for the following which shall be paid by Landlord: ________________________________</p>

<h2>OCCUPANCY</h2>
<p>The premises shall be occupied only by the Tenant and the following individuals: ________________________________</p>

<h2>PETS</h2>
<p>No pets shall be allowed on the premises without the prior written consent of the Landlord.</p>

<h2>MAINTENANCE</h2>
<p>Tenant shall maintain the premises in a clean and sanitary condition and shall immediately notify Landlord of any needed repairs.</p>

<h2>SIGNATURES</h2>

<p>LANDLORD:</p>
<p>Signature: ________________________________ Date: ____________</p>
<p>Print Name: {{landlord_name}}</p>

<p>TENANT:</p>
<p>Signature: ________________________________ Date: ____________</p>
<p>Print Name: {{tenant_name}}</p>
  '
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE leases;
