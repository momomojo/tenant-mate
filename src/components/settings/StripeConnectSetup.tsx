import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ChevronRight, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "react-router-dom";

interface StripeRequirement {
  current_deadline: number;
  currently_due: string[];
  eventually_due: string[];
  past_due: string[];
  pending_verification: string[];
}

interface AccountStatus {
  requirements: StripeRequirement;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
}

export const StripeConnectSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');

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

  // Handle OAuth return
  useEffect(() => {
    const handleOAuthReturn = async () => {
      if (!code || !state) return;

      console.log("Handling OAuth return with code:", code, "and state:", state);
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('handle-connect-oauth', {
          method: 'POST',
          body: { code, state },
        });

        console.log("OAuth handler response:", data, error);

        if (error) throw error;

        setAccountStatus(data);
        await refetchProfile();
        toast.success("Stripe account connected successfully!");
      } catch (error) {
        console.error('Error handling OAuth return:', error);
        toast.error('Failed to complete Stripe connection');
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuthReturn();
  }, [code, state, refetchProfile]);

  const setupStripeConnect = async () => {
    try {
      setIsLoading(true);
      toast.loading("Setting up Stripe Connect...");
      
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
      });

      console.log("Create connect account response:", data, error);

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

  const getRequirementsList = () => {
    if (!accountStatus?.requirements) return [];

    const allRequirements = [
      ...accountStatus.requirements.currently_due,
      ...accountStatus.requirements.eventually_due,
      ...accountStatus.requirements.past_due,
    ];

    return allRequirements.map(req => ({
      title: req.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      description: `Complete this requirement to enable payments`,
      dueDate: new Date(accountStatus.requirements.current_deadline * 1000).toLocaleDateString(),
      status: accountStatus.requirements.past_due.includes(req) ? 'past_due' : 'pending',
    }));
  };

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
            {!accountStatus?.chargesEnabled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  Your Stripe account needs additional information before you can accept payments
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              {getRequirementsList().map((req, index) => (
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
                      {req.status === 'past_due' && (
                        <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                          Past due
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Due {req.dueDate}</span>
                      <span>•</span>
                      <span>{req.description}</span>
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