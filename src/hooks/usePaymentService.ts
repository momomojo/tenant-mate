
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ValidationStatus = 'pending' | 'success' | 'failed';

type PaymentTransactionRow = Database['public']['Tables']['payment_transactions']['Row'];

export function usePaymentService() {
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);

  const createPaymentRecord = async (amount: number, unitId: string) => {
    try {
      setIsLoading(true);
      
      // Create a simple payment record without Stripe
      const { data: payment, error: paymentError } = await supabase
        .from('rent_payments')
        .insert({
          tenant_id: (await supabase.auth.getUser()).data.user?.id,
          unit_id: unitId,
          amount,
          status: 'pending',
          payment_method: 'manual'
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Payment creation error:", paymentError);
        toast.error('Failed to create payment record');
        throw paymentError;
      }

      // Log the payment initiation
      await supabase.rpc('log_payment_event', {
        p_event_type: 'payment_initiated',
        p_entity_type: 'payment',
        p_entity_id: payment.id,
        p_changes: {
          amount,
          unit_id: unitId,
          method: 'manual'
        }
      });

      toast.success('Payment record created successfully');
      return payment.id;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || 'Failed to process payment');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const viewPaymentSettings = async () => {
    try {
      setIsLoading(true);
      
      // Simply return a confirmation - in a real app, you might
      // redirect to a payment settings page
      toast.info('Payment settings feature is not available in this version');
      return true;
    } catch (error: any) {
      console.error("Payment settings error:", error);
      toast.error(error.message || 'Failed to access payment settings');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    validationStatus,
    createPaymentRecord,
    viewPaymentSettings
  };
}
