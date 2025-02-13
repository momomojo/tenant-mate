
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ValidationStatus = 'pending' | 'success' | 'failed';

// Define the validation error structure
interface ValidationError {
  message?: string;
  code?: string;
  details?: unknown;
}

// Define what we expect from the validation query
interface ValidationQueryResult {
  validation_status: string | null;
  validation_details: Record<string, unknown> | null;
  validation_errors: ValidationError | null;
}

interface CheckoutResponse {
  url: string;
  payment_id: string;
}

interface PortalResponse {
  url: string;
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
        .maybeSingle<ValidationQueryResult>();

      if (validationError) {
        console.error('Validation error:', validationError);
        setValidationStatus('failed');
        throw new Error('Unable to validate payment processing');
      }

      if (!validationData) {
        setValidationStatus('pending');
      } else {
        const errorMessage = (validationData.validation_errors as ValidationError)?.message;
        
        if (validationData.validation_status === 'failed' && errorMessage) {
          setValidationStatus('failed');
          throw new Error(errorMessage);
        }
        
        setValidationStatus(validationData.validation_status as ValidationStatus);
      }

      // Calculate total amount including platform fee (5%)
      const platformFeePercentage = 0.05; // 5%
      const platformFee = Math.round(amount * platformFeePercentage);
      const totalAmount = amount + platformFee;

      // Create the checkout session with platform fee
      const response = await supabase.functions.invoke<CheckoutResponse>("create-checkout-session", {
        body: JSON.stringify({
          amount: totalAmount,
          unit_id: unitId,
          setup_future_payments: setupFuturePayments,
          platform_fee: platformFee
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
          amount: totalAmount,
          platform_fee: platformFee,
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
