import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const StripeConnectSetup = () => {
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
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
      });

      if (error) throw error;
      
      // Redirect to Stripe Connect onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error("Failed to set up Stripe Connect. Please try again.");
    }
  };

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
      <CardContent>
        {profile.stripe_connect_account_id ? (
          <div className="text-sm text-muted-foreground">
            Your Stripe account is connected and ready to receive payments.
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