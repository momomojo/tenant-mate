
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAuthenticatedUser() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change in hook:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        navigate('/auth');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (profile) {
        setProfile(profile);
        return profile;
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // First try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        // Only show error toast if we're not on the auth page or home page
        if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
          toast.error("Please login to continue");
          navigate("/auth");
        }
        setIsLoading(false);
        return;
      }

      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        throw refreshError;
      }

      if (!refreshedSession) {
        // Session refresh failed
        await supabase.auth.signOut();
        if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
          toast.error("Session expired. Please login again");
          navigate("/auth");
        }
        setIsLoading(false);
        return;
      }

      // Get the user data with the refreshed session
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User verification error:', userError);
        await supabase.auth.signOut();
        if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
          toast.error("Authentication error. Please login again");
          navigate("/auth");
        }
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      
      // Fetch user profile
      const userProfile = await fetchUserProfile(currentUser.id);
      if (!userProfile) {
        console.warn('User profile not found, may need to complete registration');
      }
      
    } catch (error: any) {
      console.error('Auth error:', error);
      // Clear any stale session data
      await supabase.auth.signOut();
      
      // Only show error toast if we're not on the auth page or home page
      if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
        toast.error("Authentication error. Please login again");
        navigate("/auth");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { user, profile, isLoading, refreshProfile: () => fetchUserProfile(user?.id) };
}
