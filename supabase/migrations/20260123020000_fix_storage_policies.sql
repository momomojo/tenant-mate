-- SEC: Fix IDOR vulnerabilities in storage bucket policies
-- All policies previously only checked auth.uid() IS NOT NULL
-- Now they verify actual resource ownership

-- ============================================
-- LEASE DOCUMENTS: Only lease participants (tenant or property owner) can access
-- ============================================
DROP POLICY IF EXISTS "Lease participants can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can upload lease documents" ON storage.objects;

-- Lease documents: viewable by uploader OR property owner OR lease tenant
CREATE POLICY "Lease participants can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lease-documents' AND
    (
      -- The uploader can always view their own uploads
      auth.uid() = owner
      OR
      -- Property owners can view lease documents for their properties
      EXISTS (
        SELECT 1 FROM properties p
        WHERE p.id::text = split_part(name, '/', 1)
        AND p.created_by = auth.uid()
      )
      OR
      -- Tenants on a lease can view their lease documents
      EXISTS (
        SELECT 1 FROM leases l
        JOIN properties p ON p.id = l.property_id
        WHERE p.id::text = split_part(name, '/', 1)
        AND l.tenant_id = auth.uid()
      )
    )
  );

-- Only property owners can upload lease documents
CREATE POLICY "Property owners can upload lease documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lease-documents' AND
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id::text = split_part(name, '/', 1)
      AND p.created_by = auth.uid()
    )
  );

-- ============================================
-- EXPENSE RECEIPTS: Only the expense owner (property owner) can access
-- ============================================
DROP POLICY IF EXISTS "Users can view their expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their expense receipts" ON storage.objects;

-- Only the uploader can view their expense receipts
CREATE POLICY "Expense owners can view their receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-receipts' AND
    auth.uid() = owner
  );

-- Only property owners can upload receipts (path: {property_id}/{uuid})
CREATE POLICY "Property owners can upload expense receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts' AND
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id::text = split_part(name, '/', 1)
      AND p.created_by = auth.uid()
    )
  );

-- Only the uploader can delete their expense receipts
CREATE POLICY "Expense owners can delete their receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-receipts' AND
    auth.uid() = owner
  );

-- ============================================
-- INSPECTION PHOTOS: Only inspection participants can access
-- ============================================
DROP POLICY IF EXISTS "Users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON storage.objects;

-- Inspection photos: viewable by uploader or property owner
CREATE POLICY "Inspection participants can view photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inspection-photos' AND
    (
      auth.uid() = owner
      OR
      -- Property owners can view inspection photos for their properties
      EXISTS (
        SELECT 1 FROM inspections i
        JOIN properties p ON p.id = i.property_id
        WHERE i.id::text = split_part(name, '/', 1)
        AND p.created_by = auth.uid()
      )
    )
  );

-- Only property owners/managers can upload inspection photos
CREATE POLICY "Authorized users can upload inspection photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-photos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON p.id = i.property_id
      WHERE i.id::text = split_part(name, '/', 1)
      AND (p.created_by = auth.uid() OR i.created_by = auth.uid())
    )
  );

-- Only the uploader can delete inspection photos
CREATE POLICY "Uploaders can delete inspection photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inspection-photos' AND
    auth.uid() = owner
  );

-- ============================================
-- PROPERTY IMAGES: Restrict from public to authenticated users only
-- ============================================
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can delete their images" ON storage.objects;

-- Only authenticated users can view property images
CREATE POLICY "Authenticated users can view property images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-images' AND
    auth.uid() IS NOT NULL
  );

-- Only property owners can upload images
CREATE POLICY "Property owners can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' AND
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id::text = split_part(name, '/', 2)
      AND p.created_by = auth.uid()
    )
  );

-- Only property owners can delete their images
CREATE POLICY "Property owners can delete their images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    auth.uid() = owner
  );
