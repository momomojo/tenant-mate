-- Inspections Migration
-- Created: January 12, 2026
-- Purpose: Property condition reports and move-in/move-out inspections

-- ============================================
-- INSPECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- May be null for move-out after tenant leaves
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Inspection type
  inspection_type TEXT NOT NULL CHECK (inspection_type IN (
    'move_in',       -- Move-in inspection
    'move_out',      -- Move-out inspection
    'routine',       -- Periodic inspection
    'maintenance',   -- Pre/post maintenance inspection
    'annual'         -- Annual property inspection
  )),

  -- Scheduling
  scheduled_date DATE,
  completed_date DATE,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',     -- Upcoming
    'in_progress',   -- Currently being done
    'completed',     -- Finished
    'cancelled'      -- Cancelled
  )),

  -- Overall assessment
  overall_condition TEXT CHECK (overall_condition IN (
    'excellent',
    'good',
    'fair',
    'poor'
  )),

  -- Notes
  inspector_notes TEXT,
  tenant_comments TEXT,

  -- Signatures
  inspector_signature_date TIMESTAMPTZ,
  tenant_signature_date TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSPECTION ITEMS TABLE (Room/Area details)
-- ============================================
CREATE TABLE IF NOT EXISTS inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE NOT NULL,

  -- Room/Area
  room TEXT NOT NULL,  -- e.g., 'living_room', 'kitchen', 'bathroom', 'bedroom_1', 'exterior'

  -- Item being inspected
  item TEXT NOT NULL,  -- e.g., 'walls', 'floors', 'windows', 'appliances', 'fixtures'

  -- Condition
  condition TEXT CHECK (condition IN (
    'excellent',
    'good',
    'fair',
    'poor',
    'damaged',
    'missing'
  )),

  -- Details
  notes TEXT,

  -- Cost assessment (for move-out)
  estimated_repair_cost DECIMAL(10,2),
  charge_to_tenant BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSPECTION PHOTOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE NOT NULL,
  inspection_item_id UUID REFERENCES inspection_items(id) ON DELETE CASCADE,  -- Optional: specific item

  -- Photo details
  storage_path TEXT NOT NULL,
  caption TEXT,
  room TEXT,  -- Room where photo was taken

  -- Metadata
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_inspections_property ON inspections(property_id);
CREATE INDEX idx_inspections_unit ON inspections(unit_id);
CREATE INDEX idx_inspections_tenant ON inspections(tenant_id);
CREATE INDEX idx_inspections_type ON inspections(inspection_type);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_scheduled ON inspections(scheduled_date);

CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id);
CREATE INDEX idx_inspection_items_room ON inspection_items(room);

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos(inspection_id);
CREATE INDEX idx_inspection_photos_item ON inspection_photos(inspection_item_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- Inspections: Property owners and tenants can view
CREATE POLICY "Users can view inspections for their properties or units"
  ON inspections FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = inspections.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Property owners can create inspections
CREATE POLICY "Property owners can create inspections"
  ON inspections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Property owners can update inspections
CREATE POLICY "Property owners can update inspections"
  ON inspections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = inspections.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Property owners can delete inspections
CREATE POLICY "Property owners can delete inspections"
  ON inspections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = inspections.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Inspection Items: Same as parent inspection
CREATE POLICY "Users can view inspection items"
  ON inspection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_items.inspection_id
      AND (
        i.tenant_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM properties p
          WHERE p.id = i.property_id
          AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Property owners can manage inspection items"
  ON inspection_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON p.id = i.property_id
      WHERE i.id = inspection_items.inspection_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Inspection Photos: Same as parent inspection
CREATE POLICY "Users can view inspection photos"
  ON inspection_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_photos.inspection_id
      AND (
        i.tenant_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM properties p
          WHERE p.id = i.property_id
          AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Property owners can manage inspection photos"
  ON inspection_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON p.id = i.property_id
      WHERE i.id = inspection_photos.inspection_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_inspection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inspection_timestamp
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_timestamp();

-- ============================================
-- STORAGE BUCKET FOR INSPECTION PHOTOS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view inspection photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inspection-photos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can upload inspection photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-photos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete inspection photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inspection-photos' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE inspections;
