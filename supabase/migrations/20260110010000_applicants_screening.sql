-- Applicants & Screening Migration
-- Created: January 10, 2026
-- Purpose: Applicant pipeline and tenant screening system

-- ============================================
-- APPLICANTS TABLE (Before they become tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Contact info (before auth account exists)
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Pipeline status
  status TEXT DEFAULT 'invited' CHECK (status IN (
    'invited',      -- Invitation sent
    'started',      -- Started application
    'submitted',    -- Application submitted
    'screening',    -- Screening in progress
    'approved',     -- Approved for tenancy
    'rejected',     -- Application rejected
    'converted',    -- Converted to tenant
    'withdrawn'     -- Applicant withdrew
  )),

  -- Application data
  application_data JSONB DEFAULT '{}', -- Flexible form data
  application_submitted_at TIMESTAMPTZ,

  -- Screening info
  screening_order_id TEXT,             -- External provider order ID
  screening_status TEXT CHECK (screening_status IN ('pending', 'in_progress', 'completed', 'failed')),
  screening_completed_at TIMESTAMPTZ,
  screening_provider TEXT,             -- transunion, experian, etc.

  -- Decision
  decision_notes TEXT,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,

  -- Conversion
  converted_tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  -- Metadata
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCREENING REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS screening_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE NOT NULL,

  -- Provider info
  provider TEXT NOT NULL,              -- transunion, experian, etc.
  provider_order_id TEXT,

  -- Report components (stored as JSONB for flexibility)
  credit_score INTEGER,
  credit_report JSONB,
  background_check JSONB,
  eviction_history JSONB,
  income_verification JSONB,
  criminal_check JSONB,

  -- Overall recommendation
  recommendation TEXT CHECK (recommendation IN ('approve', 'conditional', 'review', 'deny')),
  recommendation_notes TEXT,

  -- Raw response for debugging
  raw_response JSONB,

  -- Metadata
  report_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,              -- Reports typically valid for 30-90 days
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPLICATION FORMS TABLE (Configurable per property)
-- ============================================
CREATE TABLE IF NOT EXISTS application_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  name TEXT NOT NULL DEFAULT 'Standard Application',
  is_default BOOLEAN DEFAULT FALSE,

  -- Form structure as JSON Schema
  form_schema JSONB NOT NULL DEFAULT '{
    "sections": [
      {
        "title": "Personal Information",
        "fields": [
          {"name": "first_name", "type": "text", "required": true},
          {"name": "last_name", "type": "text", "required": true},
          {"name": "date_of_birth", "type": "date", "required": true},
          {"name": "ssn", "type": "ssn", "required": true},
          {"name": "phone", "type": "phone", "required": true},
          {"name": "current_address", "type": "address", "required": true}
        ]
      },
      {
        "title": "Employment Information",
        "fields": [
          {"name": "employer", "type": "text", "required": true},
          {"name": "job_title", "type": "text", "required": true},
          {"name": "monthly_income", "type": "currency", "required": true},
          {"name": "employer_phone", "type": "phone", "required": false}
        ]
      },
      {
        "title": "Rental History",
        "fields": [
          {"name": "previous_landlord", "type": "text", "required": false},
          {"name": "previous_landlord_phone", "type": "phone", "required": false},
          {"name": "reason_for_leaving", "type": "textarea", "required": false}
        ]
      }
    ]
  }'::jsonb,

  -- Screening options
  require_credit_check BOOLEAN DEFAULT TRUE,
  require_background_check BOOLEAN DEFAULT TRUE,
  require_eviction_check BOOLEAN DEFAULT TRUE,
  require_income_verification BOOLEAN DEFAULT FALSE,

  -- Fees
  application_fee DECIMAL(10,2) DEFAULT 0,
  screening_fee DECIMAL(10,2) DEFAULT 35.00,  -- Passed to tenant

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_applicants_property ON applicants(property_id);
CREATE INDEX idx_applicants_unit ON applicants(unit_id);
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_applicants_email ON applicants(email);
CREATE INDEX idx_applicants_created ON applicants(created_at DESC);

CREATE INDEX idx_screening_reports_applicant ON screening_reports(applicant_id);
CREATE INDEX idx_screening_reports_provider ON screening_reports(provider);

CREATE INDEX idx_application_forms_property ON application_forms(property_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_forms ENABLE ROW LEVEL SECURITY;

-- Applicants: Property owner can see all, applicant can see own
CREATE POLICY "Property owners can view applicants"
  ON applicants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = applicants.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can create applicants"
  ON applicants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can update applicants"
  ON applicants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = applicants.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can delete applicants"
  ON applicants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = applicants.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Screening Reports: Property owner only (sensitive data)
CREATE POLICY "Property owners can view screening reports"
  ON screening_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applicants a
      JOIN properties p ON p.id = a.property_id
      WHERE a.id = screening_reports.applicant_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can create screening reports"
  ON screening_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applicants a
      JOIN properties p ON p.id = a.property_id
      WHERE a.id = applicant_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Application Forms: Property owner only
CREATE POLICY "Property owners can view application forms"
  ON application_forms FOR SELECT
  USING (
    property_id IS NULL OR  -- Default forms visible to all
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = application_forms.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can manage application forms"
  ON application_forms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = application_forms.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to convert approved applicant to tenant
CREATE OR REPLACE FUNCTION convert_applicant_to_tenant(
  p_applicant_id UUID,
  p_user_id UUID  -- The new user ID for the tenant
)
RETURNS UUID AS $$
DECLARE
  v_applicant RECORD;
  v_tenant_unit_id UUID;
BEGIN
  -- Get applicant details
  SELECT * INTO v_applicant FROM applicants WHERE id = p_applicant_id;

  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Applicant not found';
  END IF;

  IF v_applicant.status != 'approved' THEN
    RAISE EXCEPTION 'Applicant must be approved before conversion';
  END IF;

  IF v_applicant.unit_id IS NULL THEN
    RAISE EXCEPTION 'Applicant must have a unit assigned';
  END IF;

  -- Create tenant_units record
  INSERT INTO tenant_units (tenant_id, unit_id, move_in_date, status)
  VALUES (p_user_id, v_applicant.unit_id, CURRENT_DATE, 'active')
  RETURNING id INTO v_tenant_unit_id;

  -- Update applicant status
  UPDATE applicants SET
    status = 'converted',
    converted_tenant_id = p_user_id,
    converted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_applicant_id;

  -- Update unit status
  UPDATE units SET status = 'occupied' WHERE id = v_applicant.unit_id;

  RETURN v_tenant_unit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update applicant's updated_at timestamp
CREATE OR REPLACE FUNCTION update_applicant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_applicant_timestamp
  BEFORE UPDATE ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION update_applicant_timestamp();

-- ============================================
-- INSERT DEFAULT APPLICATION FORM
-- ============================================
INSERT INTO application_forms (id, name, is_default, form_schema)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Standard Rental Application',
  TRUE,
  '{
    "sections": [
      {
        "title": "Personal Information",
        "fields": [
          {"name": "first_name", "label": "First Name", "type": "text", "required": true},
          {"name": "last_name", "label": "Last Name", "type": "text", "required": true},
          {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": true},
          {"name": "ssn", "label": "Social Security Number", "type": "ssn", "required": true, "encrypted": true},
          {"name": "phone", "label": "Phone Number", "type": "phone", "required": true},
          {"name": "email", "label": "Email", "type": "email", "required": true}
        ]
      },
      {
        "title": "Current Address",
        "fields": [
          {"name": "current_street", "label": "Street Address", "type": "text", "required": true},
          {"name": "current_city", "label": "City", "type": "text", "required": true},
          {"name": "current_state", "label": "State", "type": "state", "required": true},
          {"name": "current_zip", "label": "ZIP Code", "type": "zip", "required": true},
          {"name": "time_at_address", "label": "Time at Current Address", "type": "text", "required": true}
        ]
      },
      {
        "title": "Employment",
        "fields": [
          {"name": "employer_name", "label": "Employer Name", "type": "text", "required": true},
          {"name": "job_title", "label": "Job Title", "type": "text", "required": true},
          {"name": "monthly_income", "label": "Monthly Income", "type": "currency", "required": true},
          {"name": "employment_length", "label": "Length of Employment", "type": "text", "required": true},
          {"name": "employer_phone", "label": "Employer Phone", "type": "phone", "required": false}
        ]
      },
      {
        "title": "Rental History",
        "fields": [
          {"name": "previous_address", "label": "Previous Address", "type": "text", "required": true},
          {"name": "previous_landlord_name", "label": "Previous Landlord Name", "type": "text", "required": false},
          {"name": "previous_landlord_phone", "label": "Previous Landlord Phone", "type": "phone", "required": false},
          {"name": "reason_for_moving", "label": "Reason for Moving", "type": "textarea", "required": true}
        ]
      },
      {
        "title": "Additional Information",
        "fields": [
          {"name": "pets", "label": "Do you have any pets?", "type": "boolean", "required": true},
          {"name": "pet_details", "label": "If yes, please describe", "type": "textarea", "required": false},
          {"name": "vehicles", "label": "Number of Vehicles", "type": "number", "required": true},
          {"name": "additional_occupants", "label": "Names and ages of additional occupants", "type": "textarea", "required": false}
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
