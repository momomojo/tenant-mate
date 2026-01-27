-- Fix Payment Processor RLS Policy
-- Created: January 25, 2026
-- Purpose: Allow tenants to view their landlord's payment processor preferences
-- Bug #11: Payment processor selection doesn't save is_primary flag (also fixes tenant visibility)

-- ============================================
-- DROP OLD POLICY FIRST
-- ============================================
-- Drop the old restrictive policy before creating the new one
DROP POLICY IF EXISTS "Users can view their payment processors" ON payment_processors;

-- ============================================
-- NEW POLICY: Tenants can view their landlord's processors
-- ============================================
-- This allows tenants to see which payment method their landlord prefers
-- so the Payments page can display the correct payment option.

CREATE POLICY "Tenants can view their landlord's payment processors"
  ON payment_processors FOR SELECT
  USING (
    -- Users can always see their own processors
    user_id = auth.uid()
    OR
    -- Tenants can see their landlord's processors
    EXISTS (
      SELECT 1 FROM tenant_units tu
      JOIN units u ON tu.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE tu.tenant_id = auth.uid()
      AND tu.status = 'active'
      AND p.created_by = payment_processors.user_id
    )
  );

-- ============================================
-- COMMENT
-- ============================================
COMMENT ON POLICY "Tenants can view their landlord's payment processors" ON payment_processors IS
'Allows users to view their own payment processors, and allows tenants to view their landlord''s payment processors to determine which payment method to display on the Payments page.';
