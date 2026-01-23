-- SEC: Add field-level encryption for sensitive PII (SSN, etc.)
-- Uses pgcrypto for symmetric encryption with a server-side key

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a secure config table for encryption keys (only service_role can access)
CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: Only service_role can access secrets
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- No user-facing policies - service_role bypasses RLS

-- Insert a default encryption key (should be rotated in production)
INSERT INTO app_secrets (key, value)
VALUES ('pii_encryption_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Function to encrypt PII data (called server-side via service_role)
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext text)
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT value INTO encryption_key FROM app_secrets WHERE key = 'pii_encryption_key';
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN encode(
    pgp_sym_encrypt(plaintext, encryption_key),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt PII data (called server-side via service_role)
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext text)
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT value INTO encryption_key FROM app_secrets WHERE key = 'pii_encryption_key';
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    encryption_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add encrypted_pii column to applicants for storing sensitive fields
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS encrypted_pii text;

-- Revoke direct access to encryption functions from anon/authenticated roles
-- Only service_role should call these
REVOKE EXECUTE ON FUNCTION encrypt_pii(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION decrypt_pii(text) FROM anon, authenticated;

COMMENT ON FUNCTION encrypt_pii IS 'Encrypts PII data using AES-256. Only callable by service_role.';
COMMENT ON FUNCTION decrypt_pii IS 'Decrypts PII data. Only callable by service_role.';
COMMENT ON COLUMN applicants.encrypted_pii IS 'Encrypted JSON containing sensitive PII (SSN, etc.). Use decrypt_pii() via service_role to access.';
