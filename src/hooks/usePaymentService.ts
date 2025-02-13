
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ValidationStatus = 'pending' | 'success' | 'failed';

interface ValidationDetails {
  timestamp?: string;
  status?: string;
  stripe_account_id?: string;
  error?: string;
  details?: Record<string, any>;
}

interface ValidationError {
  message: string;
  code?: string;
  details?: string;
}

interface CheckoutResponse {
  url: string;
  payment_id: string;
}

interface PortalResponse {
  url: string;
}

interface PaymentValidationResponse {
  validation_status: ValidationStatus;
  validation_details?: ValidationDetails;
  validation_errors?: { message: string; code?: string; details?: string } | null;
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
        .maybeSingle();

      if (validationError) {
        console.error('Validation error:', validationError);
        setValidationStatus('failed');
        throw new Error('Unable to validate payment processing');
      }

      if (!validationData) {
        setValidationStatus('pending');
      } else {
        const validation = validationData as unknown as PaymentValidationResponse;
        const status = validation.validation_status;
        
        if (status === 'failed' && validation.validation_errors) {
          setValidationStatus('failed');
          throw new Error(validation.validation_errors.message || 'Payment validation failed');
        }
        
        setValidationStatus(status);
      }

      // Create the checkout session
      const response = await supabase.functions.invoke<CheckoutResponse>("create-checkout-session", {
        body: JSON.stringify({
          amount,
          unit_id: unitId,
          setup_future_payments: setupFuturePayments
        })
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
      
      const response = await supabase.functions.invoke<PortalResponse>("create-portal-session", {
        body: JSON.stringify({ return_url: returnUrl })
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
