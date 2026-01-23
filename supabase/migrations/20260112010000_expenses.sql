-- Expenses Migration
-- Created: January 12, 2026
-- Purpose: Expense tracking for property managers

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,  -- Optional: specific unit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Expense details
  category TEXT NOT NULL CHECK (category IN (
    'repairs',      -- Maintenance and repairs
    'utilities',    -- Water, electric, gas, trash
    'taxes',        -- Property taxes
    'insurance',    -- Property insurance
    'management',   -- Property management fees
    'mortgage',     -- Mortgage/loan payments
    'hoa',          -- HOA fees
    'landscaping',  -- Lawn care, landscaping
    'cleaning',     -- Cleaning services
    'legal',        -- Legal fees
    'advertising',  -- Marketing, vacancy advertising
    'supplies',     -- Supplies and materials
    'other'         -- Other expenses
  )),

  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  vendor TEXT,                      -- Vendor/payee name

  -- Receipt/documentation
  receipt_path TEXT,                -- Supabase Storage path
  receipt_url TEXT,                 -- Public URL if applicable

  -- Recurring expense tracking
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN (
    'weekly', 'monthly', 'quarterly', 'annually'
  )),

  -- Tax categorization
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  tax_category TEXT,                -- IRS Schedule E category

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_unit ON expenses(unit_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_date_range ON expenses(property_id, expense_date DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Property owners can view their expenses
CREATE POLICY "Users can view their property expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = expenses.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Property owners can create expenses
CREATE POLICY "Users can create expenses for their properties"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Property owners can update their expenses
CREATE POLICY "Users can update their expenses"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = expenses.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- Property owners can delete their expenses
CREATE POLICY "Users can delete their expenses"
  ON expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = expenses.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_expense_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expense_timestamp
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_timestamp();

-- ============================================
-- STORAGE BUCKET FOR RECEIPTS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view their expense receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-receipts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can upload expense receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their expense receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-receipts' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
