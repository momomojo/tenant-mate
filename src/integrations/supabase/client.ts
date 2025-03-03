import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jjwrzarqegbswrndjpup.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd3J6YXJxZWdic3dybmRqcHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0Mzk1OTYsImV4cCI6MjA1NDAxNTU5Nn0.yrqKIeht6gSA1xFTQcV-zIGKOZvrkOfdeauKD0Zgl0I";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Add session refresh handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    // Clear local storage on sign out or token refresh
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem('supabase.auth.token');
    }
    
    // Update the auth state
    if (session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    }
  }
});