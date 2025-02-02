import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ChevronRight, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";

interface RequirementItem {
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

export const StripeConnectSetup = () => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [onboardingExited, setOnboardingExited] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const setupStripeConnect = async () => {
    try {
      toast.loading("Setting up Stripe Connect...");
      
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
      });

      if (error) throw error;
      
      if (!data?.client_secret) {
        throw new Error('No client secret received');
      }

      // Import dynamically to avoid build issues
      const { Connect } = await import('@stripe/connect-js');
      
      const stripeConnect = await Connect.initialize({
        clientSecret: data.client_secret,
        appearance: {
          variables: {
            colorPrimary: '#0F172A',
          },
        },
      });

      setStripeConnectInstance(stripeConnect);
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error("Failed to set up Stripe Connect. Please try again.");
    }
  };

  const requirements: RequirementItem[] = [
    {
      title: "Accept terms of service",
      description: "Review and accept Stripe's terms of service",
      dueDate: "Feb 2, 2024",
      status: "pending"
    },
    {
      title: "Provide an external account",
      description: "Add a bank account to receive payouts",
      dueDate: "Feb 2, 2024",
      status: "pending"
    },
    {
      title: "Provide a statement descriptor",
      description: "Add a description that appears on customer statements",
      dueDate: "Feb 2, 2024",
      status: "pending"
    },
    {
      title: "Provide a business website",
      description: "Add your business website URL",
      dueDate: "Feb 2, 2024",
      status: "pending"
    },
    {
      title: "Provide a representative",
      description: "Add details about your business representative",
      dueDate: "Feb 2, 2024",
      status: "pending"
    },
    {
      title: "Update your business information",
      description: "Complete your business profile",
      dueDate: "Feb 2, 2024",
      status: "pending"
    }
  ];

  if (isLoading) return null;

  if (profile?.role !== 'property_manager') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Connect Setup</CardTitle>
        <CardDescription>
          Set up your Stripe account to receive rent payments directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeConnectInstance ? (
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <ConnectAccountOnboarding
              onExit={() => {
                setOnboardingExited(true);
                window.location.reload();
              }}
            />
          </ConnectComponentsProvider>
        ) : profile.stripe_connect_account_id ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Your Stripe account needs additional information before you can accept payments
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={setupStripeConnect}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setupStripeConnect()}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{req.title}</h4>
                      <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                        Past due
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Due {req.dueDate}</span>
                      <span>•</span>
                      <span>Impacts payments, payouts, and transfers</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={setupStripeConnect}
            >
              Complete Account Setup
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={setupStripeConnect}>
            Connect Stripe Account
          </Button>
        )}
      </CardContent>
    </Card>
  );
};