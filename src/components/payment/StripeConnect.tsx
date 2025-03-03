
import React, { useEffect, useState } from 'react';
import { useConnect, ConnectAccountOnboarding } from '@stripe/react-connect-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectProps {
  accountId: string;
  onboardingComplete?: () => void;
}

const StripeConnect = ({ accountId, onboardingComplete }: StripeConnectProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const connect = useConnect();

  const fetchAccountSession = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be a fetch to your backend
      const response = await fetch('/api/create-account-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      
      const data = await response.json();
      
      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error(data.error || 'Failed to create account session');
      }
    } catch (error) {
      console.error('Error fetching account session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to connect your Stripe account. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingExit = (result: { sessionError?: { message: string } }) => {
    if (result.sessionError) {
      toast({
        variant: 'destructive',
        title: 'Onboarding Error',
        description: result.sessionError.message,
      });
    } else {
      toast({
        title: 'Onboarding Complete',
        description: 'Your Stripe account is now connected!',
      });
      
      if (onboardingComplete) {
        onboardingComplete();
      }
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
        {clientSecret ? (
          <ConnectAccountOnboarding
            clientSecret={clientSecret}
            appearance={{ theme: 'night' }}
            onExit={handleOnboardingExit}
          />
        ) : (
          <p>Click the button below to start the Stripe onboarding process.</p>
        )}
      </CardContent>
      <CardFooter>
        {!clientSecret && (
          <Button onClick={fetchAccountSession} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Start Onboarding'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default StripeConnect;
