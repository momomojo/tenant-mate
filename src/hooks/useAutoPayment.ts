
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAutoPayment(unitId: string, userId: string | undefined) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only check status if we have both unitId and userId
    if (unitId && userId) {
      checkAutoPayStatus();
    }
  }, [unitId, userId]); // Properly listing dependencies

  const checkAutoPayStatus = async () => {
    if (!userId || !unitId) return;
    
    try {
      const { data, error } = await supabase
        .from('automatic_payments')
        .select('is_enabled')
        .eq('tenant_id', userId)
        .eq('unit_id', unitId)
        .maybeSingle();

      if (error) throw error;
      setIsEnabled(data?.is_enabled || false);
    } catch (error) {
      console.error('Error checking autopay status:', error);
      // Only show toast for actual errors, not for missing data
      if (error.code !== 'PGRST116') {
        toast.error('Failed to check automatic payment status');
      }
    }
  };

  const toggleAutoPay = async () => {
    if (!userId || !unitId) {
      toast.error('Cannot update automatic payments at this time');
      return;
    }

    try {
      setIsLoading(true);
      const newStatus = !isEnabled;
      
      const { error } = await supabase
        .from('automatic_payments')
        .upsert({
          tenant_id: userId,
          unit_id: unitId,
          is_enabled: newStatus
        }, {
          onConflict: 'tenant_id,unit_id'
        });

      if (error) throw error;
      
      setIsEnabled(newStatus);
      toast.success(newStatus ? 'Automatic payments enabled' : 'Automatic payments disabled');
    } catch (error) {
      console.error('Error toggling autopay:', error);
      toast.error('Failed to update automatic payment settings');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEnabled,
    isLoading,
    toggleAutoPay
  };
}
