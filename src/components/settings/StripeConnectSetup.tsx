import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ChevronRight, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "react-router-dom";
import { StripeOnboardingForm } from "./StripeOnboardingForm";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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

// Helper function to format requirement keys for display
const formatRequirementKey = (key: string) => {
  // Split by dots and get the last part
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  // Convert snake_case to Title Case
  return lastPart
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Group requirements by category
const groupRequirements = (requirements: string[]) => {
  const groups: { [key: string]: string[] } = {
    'Personal Information': [],
    'Address': [],
    'Identity Verification': [],
    'Business Details': [],
    'Other': [],
  };

  requirements.forEach(req => {
    if (req.includes('address')) {
      groups['Address'].push(req);
    } else if (req.includes('dob') || req.includes('ssn') || req.includes('id_number')) {
      groups['Identity Verification'].push(req);
    } else if (req.includes('first_name') || req.includes('last_name') || req.includes('email') || req.includes('phone')) {
      groups['Personal Information'].push(req);
    } else if (req.includes('business') || req.includes('external_account')) {
      groups['Business Details'].push(req);
    } else {
      groups['Other'].push(req);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, reqs]) => reqs.length > 0)
  );
};

export const StripeConnectSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
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

  useEffect(() => {
    const fetchAccountStatus = async () => {
      if (!profile?.stripe_connect_account_id) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-connect-account-status', {
          body: { account_id: profile.stripe_connect_account_id }
        });

        if (error) throw error;
        setAccountStatus(data);
        
        // Update onboarding status in profile
        if (data.chargesEnabled && data.payoutsEnabled) {
          await supabase
            .from('profiles')
            .update({ 
              onboarding_status: 'completed',
              onboarding_completed_at: new Date().toISOString()
            })
            .eq('id', profile.id);
        }
      } catch (error) {
        console.error('Error fetching account status:', error);
        toast.error('Failed to fetch account status. Please try again.');
      }
    };

    fetchAccountStatus();
    // Poll for status updates every 30 seconds if not completed
    const interval = setInterval(() => {
      if (profile?.stripe_connect_account_id && (!accountStatus?.chargesEnabled || !accountStatus?.payoutsEnabled)) {
        fetchAccountStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [profile?.stripe_connect_account_id, accountStatus?.chargesEnabled, accountStatus?.payoutsEnabled]);

  useEffect(() => {
    const handleOAuthReturn = async () => {
      if (!code || !state) return;

      const toastId = toast.loading("Completing Stripe Connect setup...");
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('handle-connect-oauth', {
          method: 'POST',
          body: { code, state },
        });

        if (error) throw error;

        setAccountStatus(data);
        await refetchProfile();
        toast.success("Stripe account connected successfully!", { id: toastId });
      } catch (error) {
        console.error('Error handling OAuth return:', error);
        toast.error('Failed to complete Stripe connection. Please try again.', { id: toastId });
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuthReturn();
  }, [code, state, refetchProfile]);

  const setupStripeConnect = async (onboardingData?: any) => {
    const toastId = toast.loading("Setting up Stripe Connect...");
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
        body: { onboardingData },
      });

      if (error) throw error;
      
      if (data?.oauth_url) {
        // Save onboarding data before redirect
        if (onboardingData) {
          await supabase
            .from('profiles')
            .update({ 
              stripe_onboarding_data: onboardingData,
              onboarding_status: 'in_progress'
            })
            .eq('id', profile?.id);
        }
        
        window.location.href = data.oauth_url;
        return;
      }

      throw new Error('Failed to get OAuth URL');
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error('Failed to set up Stripe Connect. Please try again.', { id: toastId });
    } finally {
      setIsLoading(false);
      toast.dismiss(toastId);
    }
  };

  const getUniqueRequirements = () => {
    if (!accountStatus?.requirements) return {};

    const allRequirements = new Set([
      ...accountStatus.requirements.currently_due,
      ...accountStatus.requirements.eventually_due,
      ...accountStatus.requirements.past_due,
    ]);

    return groupRequirements(Array.from(allRequirements));
  };

  const getOnboardingProgress = () => {
    if (!accountStatus) return 0;
    const total = 4; // Total steps: account creation, details submission, charges enabled, payouts enabled
    let completed = 1; // Account creation is done if we have a status
    if (accountStatus.detailsSubmitted) completed++;
    if (accountStatus.chargesEnabled) completed++;
    if (accountStatus.payoutsEnabled) completed++;
    return (completed / total) * 100;
  };

  const openStripeDashboard = () => {
    if (!profile?.stripe_connect_account_id) return;
    window.open(`https://dashboard.stripe.com/connect/accounts/${profile.stripe_connect_account_id}`, '_blank');
  };

  if (profileLoading) return null;

  if (profile?.role !== 'property_manager') return null;

  const requirements = getUniqueRequirements();
  const hasRequirements = Object.keys(requirements).length > 0;
  const progress = getOnboardingProgress();
  const isVerified = accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled;

  if (showOnboardingForm && !profile.stripe_connect_account_id) {
    return <StripeOnboardingForm onComplete={(data) => {
      setShowOnboardingForm(false);
      setupStripeConnect(data);
    }} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Connect Setup</CardTitle>
        <CardDescription>
          Set up your Stripe account to receive rent payments directly
        </CardDescription>
        {profile.stripe_connect_account_id && (
          <Progress value={progress} className="h-2" />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.stripe_connect_account_id ? (
          <div className="space-y-4">
            {isVerified ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Account Verified</AlertTitle>
                <AlertDescription>
                  Your Stripe account is verified and ready to accept payments
                </AlertDescription>
              </Alert>
            ) : hasRequirements ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  Your Stripe account needs additional information before you can accept payments
                </AlertDescription>
              </Alert>
            ) : null}
            
            {hasRequirements && Object.entries(requirements).map(([category, reqs], index) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
                <div className="space-y-2">
                  {reqs.map((req) => (
                    <div
                      key={req}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={openStripeDashboard}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openStripeDashboard()}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{formatRequirementKey(req)}</p>
                          {accountStatus?.requirements.past_due.includes(req) && (
                            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                              Past due
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                {index < Object.entries(requirements).length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}

            <div className="flex flex-col gap-2 pt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={openStripeDashboard}
              >
                Open Stripe Dashboard
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>

              {!isVerified && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setupStripeConnect()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Account Setup
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              onClick={() => setShowOnboardingForm(true)}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Start Stripe Connect Setup'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
