-- Migration: Database Webhooks for Auto Email Notifications
-- This migration sets up database triggers that call Edge Functions
-- when certain events occur (maintenance requests, tenant assignments)

-- Enable pg_net extension for async HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a secure config table for webhook settings (only service_role can read)
CREATE TABLE IF NOT EXISTS webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Secure the config table - only service_role can access
ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service_role can access (which is what we want)
REVOKE ALL ON webhook_config FROM anon, authenticated;
GRANT SELECT ON webhook_config TO service_role;

-- Insert config values (these should be updated with actual values after deployment)
-- Run this SQL in Supabase SQL editor with your actual values:
-- INSERT INTO webhook_config (key, value) VALUES
--   ('supabase_url', 'https://your-project.supabase.co'),
--   ('service_role_key', 'your-service-role-key')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Function to call the database-webhook Edge Function
CREATE OR REPLACE FUNCTION notify_database_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Get config from secure table
  SELECT value INTO supabase_url FROM webhook_config WHERE key = 'supabase_url';
  SELECT value INTO service_role_key FROM webhook_config WHERE key = 'service_role_key';

  -- Skip if config not set
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Webhook config not set. Skipping notification.';
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Build the webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE row_to_json(NEW)::jsonb END,
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END
  );

  -- Use pg_net to make async HTTP request to Edge Function
  -- This won't block the transaction
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/database-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )::jsonb,
    body := payload
  ) INTO request_id;

  -- Log for debugging (optional)
  RAISE LOG 'Database webhook triggered: % on %, request_id: %', TG_OP, TG_TABLE_NAME, request_id;

  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the transaction if webhook fails
    RAISE WARNING 'Database webhook failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$;

-- Trigger for maintenance_requests INSERT (notify landlord of new request)
DROP TRIGGER IF EXISTS maintenance_request_created_webhook ON maintenance_requests;
CREATE TRIGGER maintenance_request_created_webhook
  AFTER INSERT ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_database_webhook();

-- Trigger for maintenance_requests UPDATE (notify tenant of status change)
DROP TRIGGER IF EXISTS maintenance_request_updated_webhook ON maintenance_requests;
CREATE TRIGGER maintenance_request_updated_webhook
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_database_webhook();

-- Trigger for tenant_units INSERT (send welcome email to new tenant)
DROP TRIGGER IF EXISTS tenant_assigned_webhook ON tenant_units;
CREATE TRIGGER tenant_assigned_webhook
  AFTER INSERT ON tenant_units
  FOR EACH ROW
  EXECUTE FUNCTION notify_database_webhook();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION notify_database_webhook() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_database_webhook() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION notify_database_webhook() IS 'Sends webhook notifications to Edge Functions for email automation';
