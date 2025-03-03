
import { useState, useEffect, useCallback } from 'react';
import { initStripeConnect, StripeConnect } from '@stripe/connect-js';

export const useStripeConnect = () => {
  const [stripeConnect, setStripeConnect] = useState<StripeConnect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConnectAndInitialize = useCallback(async () => {
    try {
      setIsLoading(true);
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key is not set');
      }

      const stripe = await initStripeConnect({
        publishableKey,
        clientSecret: async () => {
          // This would fetch an account session from your backend
          const response = await fetch('/api/account-session');
          const { clientSecret } = await response.json();
          return clientSecret;
        },
        appearance: {
          theme: 'night',
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
    loadConnectAndInitialize();
  }, [loadConnectAndInitialize]);

  return { stripeConnect, isLoading, error, reload: loadConnectAndInitialize };
};
