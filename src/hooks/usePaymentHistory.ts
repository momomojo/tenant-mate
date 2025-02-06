
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string | null;
  invoice_number: number;
  unit_number: string;
  property_id: string;
  property_name: string;
  receipt_url: string | null;
  receipt_number: string | null;
}

export function usePaymentHistory(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPaymentHistory = async () => {
    if (!userId) return [];

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payment_history_view')
        .select('*')
        .eq('tenant_id', userId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payment history:', error);
        toast.error('Failed to load payment history');
        return [];
      }

      return data as PaymentHistoryItem[];
    } catch (error) {
      console.error('Error in payment history hook:', error);
      toast.error('Failed to load payment history');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const generateReceipt = async (paymentId: string) => {
    try {
      setIsLoading(true);
      const response = await supabase.functions.invoke('generate-receipt', {
        body: { paymentId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data.receiptUrl;
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    fetchPaymentHistory,
    generateReceipt
  };
}
