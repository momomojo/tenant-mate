-- Property Enhancements Migration
-- Created: January 10, 2026
-- Purpose: Add property types and images support

-- ============================================
-- ADD PROPERTY TYPE COLUMN
-- ============================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'residential';

-- Add constraint for valid property types
ALTER TABLE properties ADD CONSTRAINT valid_property_type
  CHECK (property_type IN ('residential', 'commercial', 'mixed_use', 'industrial'));

COMMENT ON COLUMN properties.property_type IS 'Type of property: residential, commercial, mixed_use, industrial';

-- ============================================
-- PROPERTY IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_property_images_property ON property_images(property_id);
CREATE INDEX idx_property_images_order ON property_images(property_id, display_order);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Property images: Only property owner/manager can manage
CREATE POLICY "Property owners can view their property images"
  ON property_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_images.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can create property images"
  ON property_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can update property images"
  ON property_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_images.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can delete property images"
  ON property_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_images.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- ============================================
-- FUNCTION: Ensure only one primary image per property
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE property_images
    SET is_primary = FALSE
    WHERE property_id = NEW.property_id
    AND id != NEW.id
    AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_image
  BEFORE INSERT OR UPDATE ON property_images
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION ensure_single_primary_image();

-- ============================================
-- STORAGE BUCKET FOR PROPERTY IMAGES
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property images
CREATE POLICY "Property owners can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Property owners can delete their images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    auth.uid() IS NOT NULL
  );
