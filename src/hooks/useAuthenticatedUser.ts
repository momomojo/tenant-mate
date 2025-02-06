
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
        toast.error("Please login to make a payment");
        navigate("/auth");
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
      toast.error("Authentication error. Please login again.");
      navigate("/auth");
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading };
}
