-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'property_manager', 'tenant');

-- Create enum for payment validation status
CREATE TYPE payment_validation_status AS ENUM ('pending', 'success', 'failed');

-- Create enum for setting types
CREATE TYPE setting_type AS ENUM ('string', 'number', 'boolean', 'json');

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    role user_role,
    stripe_customer_id TEXT,
    default_payment_method_id TEXT,
    onboarding_status TEXT,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create properties table if it doesn't exist
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create units table if it doesn't exist
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    rent_amount DECIMAL(10, 2) NOT NULL,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    square_feet INTEGER,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (property_id, unit_number)
);

-- Create tenant_units table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenant_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES profiles(id),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    lease_start_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    rent_amount DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES profiles(id),
    unit_id UUID REFERENCES units(id),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    property_stripe_account_id UUID,
    validation_status payment_validation_status DEFAULT 'pending',
    validation_details JSONB,
    last_validation_attempt TIMESTAMP WITH TIME ZONE,
    validation_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES profiles(id),
    ip_address TEXT,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_stripe_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    stripe_connect_account_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    verification_status TEXT,
    verification_requirements JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create automatic_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS automatic_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES profiles(id),
    unit_id UUID REFERENCES units(id),
    stripe_customer_id TEXT,
    stripe_payment_method_id TEXT,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    type setting_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to validate payments
CREATE OR REPLACE FUNCTION validate_payment_transaction()
RETURNS TRIGGER AS $$
DECLARE
    stripe_account_record RECORD;
    validation_result jsonb;
BEGIN
    -- Get the Stripe account status
    SELECT 
        status,
        verification_status,
        stripe_connect_account_id,
        verification_requirements
    INTO stripe_account_record
    FROM property_stripe_accounts
    WHERE id = NEW.property_stripe_account_id
    AND is_active = true;

    -- Initialize validation result
    validation_result := jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'attempt', NEW.validation_attempts + 1
    );

    -- Validate Stripe account exists and is properly set up
    IF stripe_account_record IS NULL THEN
        validation_result := validation_result || jsonb_build_object(
            'status', 'failed',
            'error', 'No active Stripe account found'
        );
        NEW.validation_status := 'failed'::payment_validation_status;
    ELSIF stripe_account_record.status != 'completed' THEN
        validation_result := validation_result || jsonb_build_object(
            'status', 'failed',
            'error', 'Stripe account setup incomplete',
            'details', stripe_account_record.verification_requirements
        );
        NEW.validation_status := 'failed'::payment_validation_status;
    ELSIF stripe_account_record.verification_status != 'verified' THEN
        validation_result := validation_result || jsonb_build_object(
            'status', 'failed',
            'error', 'Stripe account not verified',
            'details', stripe_account_record.verification_requirements
        );
        NEW.validation_status := 'failed'::payment_validation_status;
    ELSE
        validation_result := validation_result || jsonb_build_object(
            'status', 'success',
            'stripe_account_id', stripe_account_record.stripe_connect_account_id
        );
        NEW.validation_status := 'success'::payment_validation_status;
    END IF;

    -- Update validation tracking
    NEW.validation_details := validation_result;
    NEW.last_validation_attempt := CURRENT_TIMESTAMP;
    NEW.validation_attempts := NEW.validation_attempts + 1;

    -- Log the validation attempt
    INSERT INTO payment_audit_logs (
        event_type,
        entity_type,
        entity_id,
        changes
    ) VALUES (
        'payment_validation',
        'payment_transaction',
        NEW.id,
        validation_result
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment validation
DROP TRIGGER IF EXISTS validate_payment_before_processing ON payment_transactions;
CREATE TRIGGER validate_payment_before_processing
    BEFORE INSERT OR UPDATE OF status
    ON payment_transactions
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION validate_payment_transaction();

-- Add index for faster validation queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_validation 
ON payment_transactions (validation_status, last_validation_attempt);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    (NEW.raw_user_meta_data->>'role')::user_role,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create view for payment history
CREATE OR REPLACE VIEW payment_history_view AS
SELECT 
  pt.id,
  pt.tenant_id,
  pt.unit_id,
  pt.amount,
  pt.status,
  pt.payment_method,
  pt.payment_date,
  pt.created_at,
  pt.updated_at,
  p.first_name || ' ' || p.last_name AS tenant_name,
  prop.name AS property_name,
  u.unit_number
FROM 
  payment_transactions pt
JOIN 
  profiles p ON pt.tenant_id = p.id
JOIN 
  units u ON pt.unit_id = u.id
JOIN 
  properties prop ON u.property_id = prop.id;
