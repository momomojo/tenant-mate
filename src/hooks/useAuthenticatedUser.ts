
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAuthenticatedUser() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
      
      if (!session) {
        // Only show error toast if we're not on the auth page
        if (!window.location.pathname.includes('/auth')) {
          toast.error("Please login to continue");
          navigate("/auth");
        }
        setIsLoading(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User verification error:', userError);
        await supabase.auth.signOut();
        navigate("/auth");
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('Auth error:', error);
      // Clear any stale session data
      await supabase.auth.signOut();
      
      // Only show error toast if we're not on the auth page
      if (!window.location.pathname.includes('/auth')) {
        toast.error("Authentication error. Please login again.");
        navigate("/auth");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading };
}
