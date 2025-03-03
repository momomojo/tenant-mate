
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePaymentHistory(userId?: string) {
  const [isLoading, setIsLoading] = useState(false);

  const generateReceipt = async (paymentId: string) => {
    if (!userId) {
      toast.error("You need to be logged in to generate receipts");
      return null;
    }
    
    setIsLoading(true);
    try {
      // In a real app with Stripe removed, you might generate
      // a receipt PDF or provide a link to a receipt page
      toast.info("Receipt generation is not available without Stripe integration");
      
      return null;
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      toast.error(error.message || 'Failed to generate receipt');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generateReceipt
  };
}
