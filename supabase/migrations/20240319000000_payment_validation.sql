
-- Create enum for payment validation status
CREATE TYPE payment_validation_status AS ENUM ('pending', 'success', 'failed');

-- Add columns for better validation tracking
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS validation_details jsonb,
ADD COLUMN IF NOT EXISTS last_validation_attempt timestamp with time zone,
ADD COLUMN IF NOT EXISTS validation_attempts integer DEFAULT 0;

-- Update the validation status type to use the enum
ALTER TABLE payment_transactions 
ALTER COLUMN validation_status TYPE payment_validation_status 
USING validation_status::payment_validation_status;

-- Create a function to validate payments
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
