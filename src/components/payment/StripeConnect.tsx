import React, { useState } from 'react';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectProps {
  accountId: string;
  onboardingComplete?: () => void;
}

const StripeConnect = ({ accountId, onboardingComplete }: StripeConnectProps) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<ReturnType<typeof loadConnectAndInitialize> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initializeAndFetchSession = async () => {
    setIsLoading(true);
    try {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        throw new Error('Stripe publishable key is not set');
      }

      const connectInstance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          // Fetch the account session client secret from your backend
          const response = await fetch('/api/create-account-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          });

          const data = await response.json();

          if (data.success && data.clientSecret) {
            return data.clientSecret;
          } else {
            throw new Error(data.error || 'Failed to create account session');
          }
        },
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#6366f1',
          },
        },
      });

      setStripeConnectInstance(connectInstance);
    } catch (error) {
      console.error('Error initializing Stripe Connect:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to connect your Stripe account. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingExit = () => {
    toast({
      title: 'Onboarding Complete',
      description: 'Your Stripe account is now connected!',
    });

    if (onboardingComplete) {
      onboardingComplete();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect your Stripe account</CardTitle>
        <CardDescription>
          Set up your payment processing to receive payments directly to your bank account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stripeConnectInstance ? (
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <ConnectAccountOnboarding
              onExit={handleOnboardingExit}
            />
          </ConnectComponentsProvider>
        ) : (
          <p>Click the button below to start the Stripe onboarding process.</p>
        )}
      </CardContent>
      <CardFooter>
        {!stripeConnectInstance && (
          <Button onClick={initializeAndFetchSession} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Start Onboarding'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default StripeConnect;
