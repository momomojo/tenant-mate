
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
        .maybeSingle();

      if (validationError) {
        console.error('Validation error:', validationError);
        setValidationStatus('failed');
        throw new Error('Unable to validate payment processing');
      }

      if (!validationData) {
        setValidationStatus('pending');
      } else {
        const status = validationData.validation_status as ValidationStatus;
        const errors = validationData.validation_errors as { message: string } | null;
        
        if (status === 'failed' && errors?.message) {
          setValidationStatus('failed');
          throw new Error(errors.message || 'Payment validation failed');
        }
        
        setValidationStatus(status);
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
