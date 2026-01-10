# Database Webhooks Setup Guide

This guide explains how to configure automatic email notifications triggered by database events.

## Overview

The database webhooks system sends automatic email notifications when:

1. **Maintenance Request Created** → Email sent to landlord
2. **Maintenance Request Status Changed** → Email sent to tenant
3. **Tenant Assigned to Unit** → Welcome email sent to tenant

## Architecture

```
Database Event (INSERT/UPDATE)
    ↓
PostgreSQL Trigger (notify_database_webhook)
    ↓
pg_net async HTTP request
    ↓
database-webhook Edge Function
    ↓
send-notification-email Edge Function
    ↓
Resend API → Email Delivered
```

## Setup Steps

### 1. Deploy the Edge Function

Deploy the database webhook handler:

```bash
supabase functions deploy database-webhook
```

### 2. Apply the Migration

Push the migration to create triggers:

```bash
supabase db push
```

### 3. Configure Webhook Credentials

Run this SQL in the Supabase SQL Editor (Database → SQL Editor):

```sql
-- Replace with your actual Supabase URL and service role key
INSERT INTO webhook_config (key, value) VALUES
  ('supabase_url', 'https://xbtuztzcgxhzvsvfcjvk.supabase.co'),
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

> ⚠️ **Security Note**: The service role key is stored securely in a table that only the `service_role` can access. Never expose this key in client-side code.

### 4. Set Up Resend API Key

In your Supabase Dashboard, go to **Edge Functions → Secrets** and add:

- `RESEND_API_KEY`: Your Resend API key
- `FROM_EMAIL`: Your verified sender email (optional, defaults to noreply@tenantmate.app)

### 5. Verify Configuration

Test by creating a maintenance request in the app. Check:

1. **Edge Function Logs**: Dashboard → Edge Functions → database-webhook → Logs
2. **Database Logs**: Dashboard → Logs → Postgres
3. **Email Delivery**: Check Resend dashboard for sent emails

## Troubleshooting

### Emails not sending

1. **Check webhook_config table**:
   ```sql
   SELECT * FROM webhook_config;
   ```
   Ensure both `supabase_url` and `service_role_key` are set.

2. **Check pg_net extension**:
   ```sql
   SELECT * FROM extensions.pg_net_http_response ORDER BY created DESC LIMIT 10;
   ```

3. **Check Edge Function logs** in Supabase Dashboard

### Trigger not firing

1. **Verify triggers exist**:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE trigger_name LIKE '%webhook%';
   ```

2. **Check PostgreSQL logs** for warnings:
   ```sql
   -- Look for "Webhook config not set" warnings
   ```

## Email Templates

The following email types are supported:

| Event | Template | Recipient |
|-------|----------|-----------|
| `maintenance_created` | New request notification | Landlord |
| `maintenance_status_changed` | Status update | Tenant |
| `tenant_assigned` | Welcome email | Tenant |
| `payment_received` | Payment confirmation | Tenant |

## Disabling Webhooks

To temporarily disable webhooks without removing them:

```sql
-- Disable triggers
ALTER TABLE maintenance_requests DISABLE TRIGGER maintenance_request_created_webhook;
ALTER TABLE maintenance_requests DISABLE TRIGGER maintenance_request_updated_webhook;
ALTER TABLE tenant_units DISABLE TRIGGER tenant_assigned_webhook;

-- Re-enable triggers
ALTER TABLE maintenance_requests ENABLE TRIGGER maintenance_request_created_webhook;
ALTER TABLE maintenance_requests ENABLE TRIGGER maintenance_request_updated_webhook;
ALTER TABLE tenant_units ENABLE TRIGGER tenant_assigned_webhook;
```

## Alternative: Supabase Dashboard Webhooks

Instead of using pg_net triggers, you can also configure webhooks via the Supabase Dashboard:

1. Go to **Database → Webhooks**
2. Click **Create webhook**
3. Select table and event type
4. Set URL to your Edge Function endpoint
5. Add authorization header

This approach is simpler but less flexible than the trigger-based solution.
