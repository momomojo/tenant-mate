
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRentDetails(unitId: string, user: any) {
  const [monthlyRent, setMonthlyRent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRentDetails() {
      if (!unitId || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('units')
          .select('monthly_rent')
          .eq('id', unitId)
          .single();

        if (error) throw error;
        
        setMonthlyRent(data.monthly_rent);
      } catch (error: any) {
        console.error('Error fetching rent details:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRentDetails();
  }, [unitId, user]);

  return {
    monthlyRent,
    isLoading,
    error
  };
}
