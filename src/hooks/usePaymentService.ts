
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

type ValidationStatus = 'pending' | 'success' | 'failed';

interface ValidationResult {
  validation_status: ValidationStatus | null;
  validation_details: Json | null;
  validation_errors: Json | null;
}

export function usePaymentService() {
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);

  const createCheckoutSession = async (amount: number, unitId: string, setupFuturePayments: boolean) => {
    try {
      setIsLoading(true);
      
      // First validate the payment can be processed
      const { data: validationData, error: validationError } = await supabase
        .from('payment_transactions')
        .select('validation_status, validation_details, validation_errors')
        .eq('unit_id', unitId)
        .maybeSingle() as { data: ValidationResult | null, error: Error | null };

      if (validationError) {
        console.error('Validation error:', validationError);
        setValidationStatus('failed');
        throw new Error('Unable to validate payment processing');
      }

      if (validationData?.validation_status === 'failed') {
        setValidationStatus('failed');
        const details = validationData.validation_details;
        throw new Error(details?.error || 'Payment validation failed');
      }

      setValidationStatus(validationData?.validation_status || 'pending');

      // Create the checkout session
      const response = await supabase.functions.invoke("create-checkout-session", {
        method: 'POST',
        body: JSON.stringify({
          amount,
          unit_id: unitId,
          setup_future_payments: setupFuturePayments
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.error) {
        setValidationStatus('failed');
        throw new Error(response.error.message);
      }

      setValidationStatus('success');

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
        body: JSON.stringify({ return_url: returnUrl }),
        headers: {
          "Content-Type": "application/json"
        }
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
    validationStatus,
    createCheckoutSession,
    createPortalSession
  };
}
