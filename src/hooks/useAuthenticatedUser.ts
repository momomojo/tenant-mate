// Updated January 2026 - Using getUser() for secure session validation
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export const useAuthenticatedUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Use getUser() instead of getSession() - it validates the JWT against the server
    // Per Supabase docs: "Never trust getSession() inside server code...
    // It isn't guaranteed to revalidate the Auth token."
    const getInitialUser = async () => {
      try {
        setIsLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          // Don't throw on session errors - user is just not logged in
          if (error.message.includes('session') || error.message.includes('refresh')) {
            setUser(null);
            return;
          }
          throw error;
        }

        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Update user state on auth changes
      setUser(session?.user || null);

      // Reset loading state if we were waiting for initial auth
      // Using functional update to avoid stale closure
      setIsLoading((currentLoading) => currentLoading ? false : currentLoading);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading, error };
};
