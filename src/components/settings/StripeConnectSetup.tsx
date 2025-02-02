import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ChevronRight, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "react-router-dom";

interface RequirementItem {
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

export const StripeConnectSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
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

  // Poll for profile updates when connecting account
  useEffect(() => {
    let intervalId: number;
    
    if (code) {
      // Initial refetch
      refetchProfile();
      
      // Set up polling every 2 seconds for 30 seconds
      let attempts = 0;
      intervalId = setInterval(() => {
        attempts++;
        if (attempts < 15) { // 30 seconds total
          refetchProfile();
        } else {
          clearInterval(intervalId);
        }
      }, 2000);

      // Show success toast
      toast.success("Stripe account connected successfully!");
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [code, refetchProfile]);

  const setupStripeConnect = async () => {
    try {
      setIsLoading(true);
      toast.loading("Setting up Stripe Connect...");
      
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
      });

      if (error) throw error;
      
      if (data?.oauth_url) {
        window.location.href = data.oauth_url;
        return;
      }

      throw new Error('Failed to get OAuth URL');
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error('Failed to set up Stripe Connect. Please try again.');
    } finally {
      setIsLoading(false);
      toast.dismiss();
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
    }
  ];

  if (profileLoading) return null;

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
        {profile.stripe_connect_account_id ? (
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
              disabled={isLoading}
            >
              {isLoading ? 'Setting up...' : 'Complete Account Setup'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button 
            onClick={setupStripeConnect}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Connecting...' : 'Connect Stripe Account'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};