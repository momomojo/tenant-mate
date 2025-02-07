
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValidationError {
  message: string;
  code?: string;
}

interface ValidationData {
  validation_status: string | null;
  validation_errors: ValidationError | null;
  property_stripe_accounts: {
    verification_status: string;
    status: string;
  } | null;
}

export function usePaymentService() {
  const [isLoading, setIsLoading] = useState(false);

  const createCheckoutSession = async (amount: number, unitId: string, setupFuturePayments: boolean) => {
    try {
      setIsLoading(true);
      
      // First validate the payment can be processed
      const { data: validationData, error: validationError } = await supabase
        .from('payment_transactions')
        .select('validation_status, validation_errors')
        .eq('unit_id', unitId)
        .single();

      if (validationError) {
        console.error('Validation error:', validationError);
        throw new Error('Unable to validate payment processing');
      }

      if (validationData?.validation_status === 'failed') {
        const errors = validationData.validation_errors as unknown as ValidationError;
        throw new Error(errors?.message || 'Payment validation failed');
      }

      // Create the checkout session
      const response = await supabase.functions.invoke("create-checkout-session", {
        method: 'POST',
        body: {
          amount,
          unit_id: unitId,
          setup_future_payments: setupFuturePayments
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Log the successful checkout initiation
      await supabase.rpc('log_payment_event', {
        p_event_type: 'checkout_initiated',
        p_entity_type: 'payment',
        p_entity_id: response.data.payment_id,
        p_changes: {
          amount,
          unit_id: unitId,
          setup_future_payments: setupFuturePayments
        }
      });

      return response.data.url;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || 'Failed to process payment');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createPortalSession = async (returnUrl: string) => {
    try {
      setIsLoading(true);
      
      const response = await supabase.functions.invoke("create-portal-session", {
        method: 'POST',
        body: { return_url: returnUrl }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data.url;
    } catch (error: any) {
      console.error("Portal session error:", error);
      toast.error(error.message || 'Failed to access payment portal');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createCheckoutSession,
    createPortalSession
  };
}
