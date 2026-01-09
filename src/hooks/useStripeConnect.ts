import { useState, useEffect, useCallback } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import type { StripeConnectInstance } from '@stripe/connect-js';

export const useStripeConnect = () => {
  const [stripeConnect, setStripeConnect] = useState<StripeConnectInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initializeStripeConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key is not set');
      }

      const stripe = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          // This would fetch an account session from your backend
          const response = await fetch('/api/account-session');
          const { clientSecret } = await response.json();
          return clientSecret;
        },
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#6366f1',
          },
        },
      });

      setStripeConnect(stripe);
    } catch (err) {
      console.error('Error initializing Stripe Connect:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeStripeConnect();
  }, [initializeStripeConnect]);

  return { stripeConnect, isLoading, error, reload: initializeStripeConnect };
};
