import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentFormProps {
  unitId: string;
  amount?: number;
}

export function PaymentForm({ unitId, amount: defaultAmount }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    checkAutoPayStatus();
    fetchMonthlyRent();
  }, []);

  const fetchMonthlyRent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: lease, error: leaseError } = await supabase
        .from('tenant_units')
        .select(`
          unit:units (
            monthly_rent
          )
        `)
        .eq('tenant_id', user.id)
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .single();

      if (leaseError) {
        console.error('Error fetching lease:', leaseError);
        return;
      }

      if (lease?.unit?.monthly_rent) {
        setMonthlyRent(lease.unit.monthly_rent);
      } else {
        setMonthlyRent(defaultAmount || 0);
      }
    } catch (error) {
      console.error('Error fetching monthly rent:', error);
      toast.error('Failed to fetch monthly rent amount');
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
      
      if (!session) {
        toast.error("Please login to make a payment");
        navigate("/auth");
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User verification error:', userError);
        await supabase.auth.signOut();
        navigate("/auth");
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth error:', error);
      toast.error("Authentication error. Please login again.");
      navigate("/auth");
    }
  };

  const checkAutoPayStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('automatic_payments')
        .select('is_enabled')
        .eq('tenant_id', user.id)
        .eq('unit_id', unitId)
        .maybeSingle();

      if (error) throw error;
      setAutoPayEnabled(data?.is_enabled || false);
    } catch (error) {
      console.error('Error checking autopay status:', error);
    }
  };

  const handleAutoPayToggle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = !autoPayEnabled;
      
      const { error } = await supabase
        .from('automatic_payments')
        .upsert({
          tenant_id: user.id,
          unit_id: unitId,
          is_enabled: newStatus
        }, {
          onConflict: 'tenant_id,unit_id'
        });

      if (error) throw error;
      
      setAutoPayEnabled(newStatus);
      toast.success(newStatus ? 'Automatic payments enabled' : 'Automatic payments disabled');
    } catch (error) {
      console.error('Error toggling autopay:', error);
      toast.error('Failed to update automatic payment settings');
    }
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to make a payment");
      navigate("/auth");
      return;
    }

    if (!monthlyRent) {
      toast.error("Unable to process payment. Monthly rent amount not found.");
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const response = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          amount: monthlyRent, 
          unit_id: unitId,
          setup_future_payments: autoPayEnabled 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { url } = response.data;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      if (error.message.includes('No active session')) {
        toast.error("Your session has expired. Please login again.");
        navigate("/auth");
      } else {
        toast.error("Failed to initiate payment");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
        <CardDescription>
          Secure payment processing powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Monthly Rent Amount</Label>
          <Input
            id="amount"
            value={monthlyRent || 0}
            readOnly
            type="number"
            className="bg-muted"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="autopay"
            checked={autoPayEnabled}
            onCheckedChange={handleAutoPayToggle}
          />
          <Label htmlFor="autopay">Enable automatic monthly payments</Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePayment} 
          disabled={isLoading || !isAuthenticated || !monthlyRent}
          className="w-full"
        >
          {isLoading ? "Processing..." : `Pay $${monthlyRent || 0}`}
        </Button>
      </CardFooter>
    </Card>
  );
}