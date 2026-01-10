// Updated January 2026 - Using current Supabase client patterns
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables - never hardcode credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables at runtime
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your .env file.'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
    // Note: storage defaults to localStorage
    // Note: storageKey defaults to sb-<project_ref>-auth-token (recommended)
  }
});

// Note: No manual onAuthStateChange handler needed here.
// Supabase JS client handles session persistence automatically when persistSession: true.
// Manual localStorage manipulation can cause race conditions and is not recommended.
