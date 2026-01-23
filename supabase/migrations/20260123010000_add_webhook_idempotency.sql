-- SEC-03: Webhook idempotency table to prevent duplicate event processing
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_processed_webhook_events_event_id ON processed_webhook_events(event_id);

-- Auto-cleanup: remove events older than 7 days to prevent table bloat
-- (Stripe guarantees events are not replayed after 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: Only service role can access this table
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No user-facing policies needed - only service role key accesses this table
