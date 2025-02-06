
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { StripeOnboardingForm } from "./StripeOnboardingForm";
import { Progress } from "@/components/ui/progress";
import { StripeRequirementGroup } from "./components/StripeRequirementGroup";
import { StripeAccountStatus } from "./components/StripeAccountStatus";
import { StripeAccountActions } from "./components/StripeAccountActions";

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
  remediationLink?: string;
}

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
    const total = 4;
    let completed = 1;
    if (accountStatus.detailsSubmitted) completed++;
    if (accountStatus.chargesEnabled) completed++;
    if (accountStatus.payoutsEnabled) completed++;
    return (completed / total) * 100;
  };

  const openStripeDashboard = () => {
    if (!profile?.stripe_connect_account_id) return;
    window.open(`https://dashboard.stripe.com/connect/accounts/${profile.stripe_connect_account_id}`, '_blank');
  };

  const handleRequirementClick = (requirement: string) => {
    if (accountStatus?.remediationLink) {
      window.open(accountStatus.remediationLink, '_blank');
    } else {
      openStripeDashboard();
    }
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
            <StripeAccountStatus 
              isVerified={isVerified} 
              hasRequirements={hasRequirements} 
            />
            
            {hasRequirements && Object.entries(requirements).map(([category, reqs], index) => (
              <StripeRequirementGroup
                key={category}
                category={category}
                requirements={reqs}
                pastDueRequirements={accountStatus?.requirements.past_due || []}
                isLastGroup={index === Object.entries(requirements).length - 1}
                onItemClick={handleRequirementClick}
              />
            ))}

            <StripeAccountActions
              isVerified={isVerified}
              isLoading={isLoading}
              remediationLink={accountStatus?.remediationLink}
              onDashboardOpen={openStripeDashboard}
              onSetupComplete={() => setupStripeConnect()}
            />
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
