
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface PropertyStripeAccount {
  id: string;
  property_id: string;
  property_name: string;
  stripe_connect_account_id: string | null;
  status: string;
  verification_status: string;
  is_active: boolean;
  verification_requirements?: any;
  verification_errors?: any;
  last_webhook_received_at?: string;
}

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
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const property_id = searchParams.get('property_id');

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

  const { data: propertyAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ["propertyStripeAccounts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("property_stripe_accounts")
        .select(`
          *,
          property:properties(
            id,
            name
          )
        `)
        .eq("property_manager_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data.map(account => ({
        ...account,
        property_id: account.property.id,
        property_name: account.property.name
      }));
    },
    enabled: !!profile?.id
  });

  useEffect(() => {
    const fetchAccountStatus = async () => {
      if (!selectedProperty) return;
      
      const account = propertyAccounts?.find(a => a.property_id === selectedProperty);
      if (!account?.stripe_connect_account_id) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-connect-account-status', {
          body: { account_id: account.stripe_connect_account_id }
        });

        if (error) throw error;
        setAccountStatus(data);
        
        if (data.chargesEnabled && data.payoutsEnabled) {
          const wasOnboardingIncomplete = account.status !== 'completed';
          
          if (wasOnboardingIncomplete) {
            const { error: updateError } = await supabase
              .from('property_stripe_accounts')
              .update({ 
                status: 'completed',
                verification_status: 'verified',
                updated_at: new Date().toISOString()
              })
              .eq('id', account.id);
              
            if (!updateError) {
              toast.success("Stripe account verification completed! You can now accept payments for this property.");
              await refetchAccounts();
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
      if (selectedProperty && propertyAccounts?.find(a => 
        a.property_id === selectedProperty && 
        (a.status !== 'completed' || a.verification_status !== 'verified')
      )) {
        fetchAccountStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedProperty, propertyAccounts]);

  useEffect(() => {
    const handleOAuthReturn = async () => {
      if (!code || !state || !property_id) return;

      const toastId = toast.loading("Completing Stripe Connect setup...");
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('handle-connect-oauth', {
          method: 'POST',
          body: { code, state, property_id },
        });

        if (error) throw error;

        setAccountStatus(data);
        setSelectedProperty(property_id);
        await refetchAccounts();
        toast.success("Successfully connected to Stripe! Please complete any remaining verification steps.", { id: toastId });
      } catch (error) {
        console.error('Error handling OAuth return:', error);
        toast.error('Failed to complete Stripe connection. Please try again.', { id: toastId });
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuthReturn();
  }, [code, state, property_id, refetchAccounts]);

  const setupStripeConnect = async (propertyId: string, onboardingData?: any) => {
    const toastId = toast.loading("Setting up Stripe Connect...");
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
        body: { propertyId, onboardingData },
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

  const getUniqueRequirements = () => {
    if (!accountStatus?.requirements) return {};
    return groupRequirements([
      ...accountStatus.requirements.currently_due,
      ...accountStatus.requirements.eventually_due,
      ...accountStatus.requirements.past_due,
    ]);
  };

  const getOnboardingProgress = (account: PropertyStripeAccount) => {
    if (!accountStatus) return 25;
    const total = 4;
    let completed = 1;
    if (account.stripe_connect_account_id) completed++;
    if (account.status === 'completed') completed++;
    if (account.verification_status === 'verified') completed++;
    return (completed / total) * 100;
  };

  const openStripeDashboard = (accountId: string) => {
    if (!accountId) return;
    window.open(`https://dashboard.stripe.com/connect/accounts/${accountId}`, '_blank');
  };

  const handleRequirementClick = (requirement: string) => {
    if (accountStatus?.remediationLink) {
      window.open(accountStatus.remediationLink, '_blank');
    } else {
      const account = propertyAccounts?.find(a => a.property_id === selectedProperty);
      if (account?.stripe_connect_account_id) {
        openStripeDashboard(account.stripe_connect_account_id);
      }
    }
  };

  if (profileLoading || accountsLoading) return null;

  // Only check for property_manager role
  if (profile?.role !== 'property_manager') return null;

  const requirements = accountStatus?.requirements ? getUniqueRequirements() : {};
  const hasRequirements = Object.keys(requirements).length > 0;
  const selectedAccount = propertyAccounts?.find(a => a.property_id === selectedProperty);
  
  // Changed this line to always show the setup button if there's no stripe_connect_account_id
  const showSetupButton = !selectedAccount?.stripe_connect_account_id;
  const isVerified = selectedAccount?.status === 'completed' && selectedAccount?.verification_status === 'verified';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Processing Setup</CardTitle>
        <CardDescription>
          Set up Stripe Connect to accept rent payments securely for each of your properties.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs 
          value={selectedProperty || 'overview'} 
          onValueChange={setSelectedProperty}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {propertyAccounts?.map((account) => (
              <TabsTrigger key={account.property_id} value={account.property_id}>
                {account.property_name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              {propertyAccounts?.map((account) => (
                <Card key={account.property_id}>
                  <CardHeader>
                    <CardTitle>{account.property_name}</CardTitle>
                    <Progress value={getOnboardingProgress(account)} className="h-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Status: {account.status === 'completed' ? '✅ Ready' : '⏳ Setup needed'}
                      </p>
                      <Button 
                        onClick={() => setSelectedProperty(account.property_id)}
                        variant={account.status === 'completed' ? 'outline' : 'default'}
                      >
                        {account.status === 'completed' ? 'View Details' : 'Complete Setup'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {propertyAccounts?.map((account) => (
            <TabsContent key={account.property_id} value={account.property_id}>
              <div className="space-y-4">
                {account.stripe_connect_account_id ? (
                  <>
                    <StripeAccountStatus 
                      isVerified={isVerified} 
                      hasRequirements={hasRequirements}
                      propertyName={account.property_name}
                      verificationDetails={{
                        requirements: accountStatus?.requirements,
                        status: account.status,
                        verificationStatus: account.verification_status,
                        lastUpdated: account.last_webhook_received_at
                      }}
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
                      onDashboardOpen={() => account.stripe_connect_account_id && openStripeDashboard(account.stripe_connect_account_id)}
                      onSetupComplete={() => setupStripeConnect(account.property_id)}
                    />
                  </>
                ) : (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => setupStripeConnect(account.property_id)}
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
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
