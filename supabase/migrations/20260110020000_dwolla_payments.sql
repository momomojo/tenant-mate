-- Dwolla ACH Payments Migration
-- Created: January 10, 2026
-- Purpose: Support Dwolla as alternative to Stripe for lower ACH fees ($0.25/tx)

-- ============================================
-- PAYMENT PROCESSORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Processor type
  processor TEXT NOT NULL CHECK (processor IN ('stripe', 'dwolla', 'adyen')),
  is_primary BOOLEAN DEFAULT FALSE,

  -- Stripe-specific (existing integration)
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Dwolla-specific
  dwolla_customer_id TEXT,             -- Dwolla customer ID
  dwolla_customer_url TEXT,            -- Dwolla customer URL
  dwolla_funding_source_id TEXT,       -- Primary bank account
  dwolla_funding_source_name TEXT,     -- Bank account name (e.g., "Chase ****1234")
  dwolla_verified BOOLEAN DEFAULT FALSE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  verification_status TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DWOLLA TRANSFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dwolla_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  rent_payment_id UUID REFERENCES rent_payments(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Dwolla info
  dwolla_transfer_id TEXT NOT NULL,
  dwolla_transfer_url TEXT,

  -- Transfer details
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0.25,      -- $0.25 per transaction
  net_amount DECIMAL(10,2),             -- amount - fee

  -- Source/Destination
  source_funding_source TEXT,
  destination_funding_source TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processed',
    'completed',
    'cancelled',
    'failed'
  )),
  failure_reason TEXT,

  -- Correlation
  correlation_id TEXT,                  -- For idempotency

  -- Timestamps
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DWOLLA WEBHOOKS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS dwolla_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,       -- Dwolla event ID
  topic TEXT NOT NULL,                  -- Event topic (e.g., 'transfer_completed')
  resource_id TEXT,                     -- Resource ID (e.g., transfer ID)
  payload JSONB NOT NULL,               -- Full webhook payload
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANT PAYMENT METHODS (Bank Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Payment method type
  method_type TEXT NOT NULL CHECK (method_type IN ('card', 'bank_account')),

  -- For cards (Stripe)
  stripe_payment_method_id TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- For bank accounts (Dwolla)
  dwolla_funding_source_id TEXT,
  bank_name TEXT,
  bank_account_type TEXT,              -- checking, savings
  bank_last4 TEXT,
  bank_verified BOOLEAN DEFAULT FALSE,

  -- Common
  is_default BOOLEAN DEFAULT FALSE,
  nickname TEXT,                        -- User-friendly name

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_payment_processors_user ON payment_processors(user_id);
CREATE INDEX idx_payment_processors_type ON payment_processors(processor);
CREATE INDEX idx_payment_processors_primary ON payment_processors(user_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX idx_dwolla_transfers_payment ON dwolla_transfers(rent_payment_id);
CREATE INDEX idx_dwolla_transfers_tenant ON dwolla_transfers(tenant_id);
CREATE INDEX idx_dwolla_transfers_landlord ON dwolla_transfers(landlord_id);
CREATE INDEX idx_dwolla_transfers_status ON dwolla_transfers(status);
CREATE INDEX idx_dwolla_transfers_dwolla_id ON dwolla_transfers(dwolla_transfer_id);

CREATE INDEX idx_dwolla_webhooks_event ON dwolla_webhook_events(event_id);
CREATE INDEX idx_dwolla_webhooks_topic ON dwolla_webhook_events(topic);
CREATE INDEX idx_dwolla_webhooks_processed ON dwolla_webhook_events(processed) WHERE processed = FALSE;

CREATE INDEX idx_tenant_payment_methods_tenant ON tenant_payment_methods(tenant_id);
CREATE INDEX idx_tenant_payment_methods_default ON tenant_payment_methods(tenant_id, is_default) WHERE is_default = TRUE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE payment_processors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dwolla_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dwolla_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_methods ENABLE ROW LEVEL SECURITY;

-- Payment Processors: Users can only see their own
CREATE POLICY "Users can view their payment processors"
  ON payment_processors FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their payment processors"
  ON payment_processors FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their payment processors"
  ON payment_processors FOR UPDATE
  USING (user_id = auth.uid());

-- Dwolla Transfers: Participants can view
CREATE POLICY "Transfer participants can view transfers"
  ON dwolla_transfers FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    landlord_id = auth.uid()
  );

-- Webhook events: Service role only (no direct user access)
CREATE POLICY "No direct access to webhook events"
  ON dwolla_webhook_events FOR SELECT
  USING (FALSE);

-- Tenant Payment Methods: Tenants can manage their own
CREATE POLICY "Tenants can view their payment methods"
  ON tenant_payment_methods FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can create payment methods"
  ON tenant_payment_methods FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update their payment methods"
  ON tenant_payment_methods FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can delete their payment methods"
  ON tenant_payment_methods FOR DELETE
  USING (tenant_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Ensure only one primary payment processor per user
CREATE OR REPLACE FUNCTION ensure_single_primary_processor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE payment_processors
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_processor
  BEFORE INSERT OR UPDATE ON payment_processors
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION ensure_single_primary_processor();

-- Ensure only one default payment method per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE tenant_payment_methods
    SET is_default = FALSE
    WHERE tenant_id = NEW.tenant_id
    AND id != NEW.id
    AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_payment_method
  BEFORE INSERT OR UPDATE ON tenant_payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Update rent_payment status when Dwolla transfer completes
CREATE OR REPLACE FUNCTION handle_dwolla_transfer_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update the rent payment
    UPDATE rent_payments SET
      status = 'completed',
      payment_date = NOW()
    WHERE id = NEW.rent_payment_id;

    -- Create payment transaction record
    INSERT INTO payment_transactions (
      rent_payment_id,
      amount,
      fee,
      net_amount,
      payment_method,
      processor,
      processor_transaction_id,
      status
    ) VALUES (
      NEW.rent_payment_id,
      NEW.amount,
      NEW.fee,
      NEW.net_amount,
      'ach',
      'dwolla',
      NEW.dwolla_transfer_id,
      'completed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_dwolla_transfer_complete
  AFTER UPDATE ON dwolla_transfers
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION handle_dwolla_transfer_complete();

-- ============================================
-- MIGRATE EXISTING STRIPE DATA (if any)
-- ============================================
-- Create payment_processors records for existing Stripe accounts
INSERT INTO payment_processors (user_id, processor, stripe_account_id, stripe_onboarding_complete, is_primary, status)
SELECT
  user_id,
  'stripe',
  stripe_account_id,
  onboarding_complete,
  TRUE,
  CASE WHEN onboarding_complete THEN 'active' ELSE 'pending' END
FROM company_stripe_accounts
WHERE stripe_account_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add processor column to payment_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions'
    AND column_name = 'processor'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN processor TEXT DEFAULT 'stripe';
  END IF;
END $$;
