
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { StripeAccountStatus } from "./components/StripeAccountStatus";
import { StripeAccountActions } from "./components/StripeAccountActions";

interface AccountStatus {
  requirements: {
    current_deadline: number;
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  remediationLink?: string;
}

export const StripeConnectSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
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

  const { data: companyStripeAccount, isLoading: accountLoading, refetch: refetchAccount } = useQuery({
    queryKey: ["companyStripeAccount"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("company_stripe_accounts")
        .select("*")
        .eq("status", "completed")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.id
  });

  useEffect(() => {
    const fetchAccountStatus = async () => {
      if (!companyStripeAccount?.stripe_connect_account_id) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-connect-account-status', {
          body: { account_id: companyStripeAccount.stripe_connect_account_id }
        });

        if (error) throw error;
        setAccountStatus(data);
        
        if (data.chargesEnabled && data.payoutsEnabled) {
          const wasOnboardingIncomplete = companyStripeAccount.status !== 'completed';
          
          if (wasOnboardingIncomplete) {
            const { error: updateError } = await supabase
              .from('company_stripe_accounts')
              .update({ 
                status: 'completed',
                verification_status: 'verified',
                updated_at: new Date().toISOString()
              })
              .eq('id', companyStripeAccount.id);
              
            if (!updateError) {
              toast.success("Stripe account verification completed! You can now accept payments.");
              await refetchAccount();
            }
          }
        }
      } catch (error: any) {
        console.error('Error fetching account status:', error);
        toast.error('Failed to fetch account status. Please try again.');
      }
    };

    fetchAccountStatus();
    const interval = setInterval(() => {
      if (companyStripeAccount && 
        (companyStripeAccount.status !== 'completed' || 
         companyStripeAccount.verification_status !== 'verified')
      ) {
        fetchAccountStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [companyStripeAccount]);

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
        await refetchAccount();
        toast.success("Successfully connected to Stripe! Please complete any remaining verification steps.", { id: toastId });
      } catch (error) {
        console.error('Error handling OAuth return:', error);
        toast.error('Failed to complete Stripe connection. Please try again.', { id: toastId });
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuthReturn();
  }, [code, state, refetchAccount]);

  const setupStripeConnect = async () => {
    const toastId = toast.loading("Setting up Stripe Connect...");
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      // Check for terminated accounts and clean them up if needed
      const { data: existingAccount } = await supabase
        .from('company_stripe_accounts')
        .select('*')
        .eq('status', 'terminated')
        .maybeSingle();

      if (existingAccount) {
        const { error: deleteError } = await supabase
          .from('company_stripe_accounts')
          .delete()
          .eq('id', existingAccount.id);

        if (deleteError) {
          console.error('Error cleaning up terminated account:', deleteError);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
        body: { userId: user.id },
      });

      if (error) throw error;
      
      if (data?.oauth_url) {
        window.location.href = data.oauth_url;
        return;
      }

      throw new Error('Failed to get OAuth URL');
    } catch (error: any) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error('Failed to set up Stripe Connect. Please try again.', { id: toastId });
    } finally {
      setIsLoading(false);
      toast.dismiss(toastId);
    }
  };

  const openStripeDashboard = (accountId: string) => {
    if (!accountId) return;
    window.open(`https://dashboard.stripe.com/connect/accounts/${accountId}`, '_blank');
  };

  const handleRequirementClick = () => {
    if (accountStatus?.remediationLink) {
      window.open(accountStatus.remediationLink, '_blank');
    } else if (companyStripeAccount?.stripe_connect_account_id) {
      openStripeDashboard(companyStripeAccount.stripe_connect_account_id);
    }
  };

  if (profileLoading || accountLoading) return null;

  // Only check for property_manager role
  if (profile?.role !== 'property_manager') return null;

  const requirements = accountStatus?.requirements ? {
    ...accountStatus.requirements,
    past_due: accountStatus.requirements.past_due || [],
    eventually_due: accountStatus.requirements.eventually_due || [],
    currently_due: accountStatus.requirements.currently_due || [],
  } : null;
  
  const hasRequirements = requirements && (
    requirements.past_due.length > 0 || 
    requirements.eventually_due.length > 0 || 
    requirements.currently_due.length > 0
  );
  
  const isVerified = companyStripeAccount?.status === 'completed' && 
                     companyStripeAccount?.verification_status === 'verified';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Processing Setup</CardTitle>
        <CardDescription>
          Set up Stripe Connect to accept rent payments securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {companyStripeAccount?.stripe_connect_account_id ? (
          <>
            <StripeAccountStatus 
              isVerified={isVerified} 
              hasRequirements={!!hasRequirements}
              verificationDetails={{
                requirements,
                status: companyStripeAccount.status,
                verificationStatus: companyStripeAccount.verification_status,
                lastUpdated: companyStripeAccount.updated_at
              }}
            />
            
            <StripeAccountActions
              isVerified={isVerified}
              isLoading={isLoading}
              remediationLink={accountStatus?.remediationLink}
              onDashboardOpen={() => companyStripeAccount.stripe_connect_account_id && 
                openStripeDashboard(companyStripeAccount.stripe_connect_account_id)}
              onSetupComplete={handleRequirementClick}
            />
          </>
        ) : (
          <div className="space-y-4">
            <Button 
              onClick={setupStripeConnect}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Start Payment Setup'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

