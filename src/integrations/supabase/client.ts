
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
  },
  db: {
    schema: 'public'
  }
});

// Add session refresh handler
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_OUT') {
    // Clear local storage on sign out
    localStorage.removeItem('supabase.auth.token');
    console.log('User signed out, session cleared');
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Update the auth state
    if (session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      console.log('Session updated:', session.user?.email);
    }
  }
});

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper function to refresh session
export const refreshSession = async () => {
  const { data: { session } } = await supabase.auth.refreshSession();
  return session;
};
