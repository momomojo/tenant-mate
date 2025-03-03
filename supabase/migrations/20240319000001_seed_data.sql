-- Seed system settings
INSERT INTO system_settings (key, value, type, description)
VALUES 
  ('payment_fee_percentage', '2.9', 'number', 'Percentage fee for payment processing'),
  ('payment_fixed_fee', '0.30', 'number', 'Fixed fee for payment processing in dollars'),
  ('company_name', '"TenantMate Property Management"', 'string', 'Company name for receipts and emails'),
  ('company_address', '"123 Main St, Anytown, USA 12345"', 'string', 'Company address for receipts'),
  ('company_email', '"support@tenantmate.com"', 'string', 'Support email address'),
  ('company_phone', '"(555) 123-4567"', 'string', 'Support phone number'),
  ('maintenance_categories', '["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Pest Control", "Landscaping", "Other"]', 'json', 'Categories for maintenance requests')
ON CONFLICT (key) DO NOTHING;

-- Create test property
INSERT INTO properties (id, name, address_line1, city, state, postal_code)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sunset Apartments', '123 Sunset Blvd', 'Los Angeles', 'CA', '90210'),
  ('22222222-2222-2222-2222-222222222222', 'Mountain View Condos', '456 Mountain Rd', 'Denver', 'CO', '80202')
ON CONFLICT (id) DO NOTHING;

-- Create test units
INSERT INTO units (id, property_id, unit_number, rent_amount, bedrooms, bathrooms, square_feet)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '101', 1500.00, 2, 1.5, 950),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '102', 1600.00, 2, 2.0, 1050),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'A1', 1800.00, 3, 2.0, 1200),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'A2', 1700.00, 2, 2.0, 1100)
ON CONFLICT (id) DO NOTHING;

-- Create test tenant_units (will be populated after user creation)
-- This will be handled by the application when users sign up and are assigned to units

-- Create RLS policies for tables
-- Properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Property managers can view properties" 
  ON properties FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'property_manager')
    )
  );

-- Units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Property managers can view all units" 
  ON units FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'property_manager')
    )
  );

CREATE POLICY "Tenants can view their assigned units" 
  ON units FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_units 
      WHERE tenant_units.unit_id = units.id 
      AND tenant_units.tenant_id = auth.uid()
    )
  );

-- Tenant Units
ALTER TABLE tenant_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Property managers can view all tenant_units" 
  ON tenant_units FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'property_manager')
    )
  );

CREATE POLICY "Tenants can view their own tenant_units" 
  ON tenant_units FOR SELECT 
  USING (tenant_id = auth.uid());

-- Payment Transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Property managers can view all payment_transactions" 
  ON payment_transactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'property_manager')
    )
  );

CREATE POLICY "Tenants can view their own payment_transactions" 
  ON payment_transactions FOR SELECT 
  USING (tenant_id = auth.uid());

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user if it doesn't exist
  INSERT INTO public.profiles (id, email, first_name, last_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_registration(); 