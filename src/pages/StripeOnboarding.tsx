
import React, { useState, useEffect } from 'react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, ExternalLink, RefreshCcw } from 'lucide-react';
import StripeConnect from '@/components/payment/StripeConnect';

const StripeOnboarding = () => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const { stripeConnect, isLoading, error, reload } = useStripeConnect();
  const { toast } = useToast();

  const createConnectedAccount = async () => {
    try {
      // In a real app, this would be a fetch to your backend
      const response = await fetch('/api/create-connected-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com', // In a real app, get from authenticated user
        }),
      });

      const data = await response.json();
      
      if (data.success && data.accountId) {
        setAccountId(data.accountId);
        toast({
          title: 'Account Created',
          description: 'Your Stripe connected account has been created. Continue to onboarding.',
        });
      } else {
        throw new Error(data.error || 'Failed to create connected account');
      }
    } catch (error) {
      console.error('Error creating connected account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create Stripe account. Please try again.',
      });
    }
  };

  const handleOnboardingComplete = () => {
    toast({
      title: 'Success',
      description: 'Your Stripe account is now fully set up and ready to process payments!',
    });
    // In a real app, you would update the user's profile to mark Stripe as connected
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Stripe Integration</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="account">Account Setup</TabsTrigger>
          <TabsTrigger value="payments">Payment Processing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Connect with Stripe</CardTitle>
              <CardDescription>
                Set up your Stripe account to receive payments directly to your bank account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-4">
                  <p>Error initializing Stripe: {error.message}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2" 
                    onClick={reload}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                  </Button>
                </div>
              )}
              
              {isLoading ? (
                <p>Loading Stripe integration...</p>
              ) : (
                <div className="space-y-6">
                  {!accountId ? (
                    <div>
                      <p className="mb-4">
                        To receive payments, you'll need to connect a Stripe account. This allows you to
                        get paid directly to your bank account.
                      </p>
                      <Button onClick={createConnectedAccount}>
                        Create Stripe Account <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <StripeConnect 
                      accountId={accountId} 
                      onboardingComplete={handleOnboardingComplete} 
                    />
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    <p>
                      By connecting with Stripe, you agree to their{" "}
                      <a 
                        href="https://stripe.com/legal/connect-account" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Terms of Service <ExternalLink className="inline h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing</CardTitle>
              <CardDescription>
                Manage your payment settings and view transaction history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                You'll be able to manage payment settings and view transaction history once your
                Stripe account is fully set up.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StripeOnboarding;
