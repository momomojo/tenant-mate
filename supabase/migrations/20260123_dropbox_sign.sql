-- Dropbox Sign (E-Signature) Integration
-- Tables for managing signature providers and tracking webhook events

-- Signature providers configuration per user
CREATE TABLE IF NOT EXISTS signature_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'dropbox_sign' CHECK (provider IN ('dropbox_sign', 'docusign', 'manual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Dropbox Sign webhook events log
CREATE TABLE IF NOT EXISTS dropbox_sign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  signature_request_id TEXT,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dropbox_sign_events_signature_request
  ON dropbox_sign_events(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_dropbox_sign_events_lease
  ON dropbox_sign_events(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_providers_user
  ON signature_providers(user_id);

-- RLS Policies
ALTER TABLE signature_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropbox_sign_events ENABLE ROW LEVEL SECURITY;

-- Signature providers: users can manage their own
CREATE POLICY "Users can view own signature providers"
  ON signature_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signature providers"
  ON signature_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signature providers"
  ON signature_providers FOR UPDATE
  USING (auth.uid() = user_id);

-- Dropbox Sign events: property managers can view events for their leases
CREATE POLICY "Users can view own lease signature events"
  ON dropbox_sign_events FOR SELECT
  USING (
    lease_id IN (
      SELECT l.id FROM leases l
      JOIN properties p ON l.property_id = p.id
      WHERE p.created_by = auth.uid() OR p.property_manager_id = auth.uid()
    )
  );

-- Service role can insert events (from webhook)
CREATE POLICY "Service role can insert events"
  ON dropbox_sign_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update events"
  ON dropbox_sign_events FOR UPDATE
  USING (true);
