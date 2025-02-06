
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { usePaymentService } from '@/hooks/usePaymentService';
import { useAutoPayment } from '@/hooks/useAutoPayment';
import { AutoPayToggle } from './AutoPayToggle';
import { PaymentError } from './PaymentError';

interface PaymentFormProps {
  unitId: string;
  amount?: number;
}

export function PaymentForm({ unitId, amount: defaultAmount }: PaymentFormProps) {
  const [monthlyRent, setMonthlyRent] = useState<number | null>(null);
  const [stripeConnectError, setStripeConnectError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { user, isLoading: isAuthLoading } = useAuthenticatedUser();
  const { isLoading: isPaymentLoading, createCheckoutSession, createPortalSession } = usePaymentService();
  const { isEnabled: autoPayEnabled, isLoading: isAutoPayLoading, toggleAutoPay } = 
    useAutoPayment(unitId, user?.id);

  React.useEffect(() => {
    if (user?.id) {
      fetchMonthlyRent();
    }
  }, [user]);

  const fetchMonthlyRent = async () => {
    try {
      // Get the property_manager_assignments view to get all the necessary information
      const { data: assignment, error: assignmentError } = await supabase
        .from('property_manager_assignments')
        .select('*')
        .eq('unit_id', unitId)
        .eq('tenant_id', user.id)
        .maybeSingle();

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError);
        setStripeConnectError("Error fetching payment information. Please try again later.");
        return;
      }

      if (!assignment) {
        console.error('No assignment found for this unit and tenant');
        setStripeConnectError("You don't have permission to make payments for this unit.");
        return;
      }

      // Check if property manager has Stripe Connect set up
      if (!assignment.stripe_connect_account_id) {
        setStripeConnectError("Your property manager hasn't set up payments yet. Please contact them to enable online payments.");
        return;
      }

      // Get the monthly rent from the units table
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('monthly_rent')
        .eq('id', unitId)
        .maybeSingle();

      if (unitError) {
        console.error('Error fetching unit:', unitError);
        setStripeConnectError("Error fetching rent amount. Please try again later.");
        return;
      }

      if (!unit) {
        console.error('No unit found');
        setStripeConnectError("Unit information not found.");
        return;
      }

      setMonthlyRent(unit.monthly_rent || defaultAmount || 0);
    } catch (error) {
      console.error('Error fetching monthly rent:', error);
      toast.error('Failed to fetch monthly rent amount');
    }
  };

  const handlePayment = async () => {
    if (!monthlyRent) {
      toast.error("Unable to process payment. Monthly rent amount not found.");
      return;
    }

    if (stripeConnectError) {
      toast.error(stripeConnectError);
      return;
    }

    try {
      const url = await createCheckoutSession(monthlyRent, unitId, autoPayEnabled);
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      if (error.message.includes("No active session")) {
        toast.error("Your session has expired. Please login again.");
        navigate("/auth");
      } else {
        toast.error("Failed to initiate payment. Please try again later.");
      }
    }
  };

  const handleCustomerPortal = async () => {
    try {
      const url = await createPortalSession(window.location.origin + "/payments");
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error("Failed to access payment settings. Please try again.");
    }
  };

  const isLoading = isAuthLoading || isPaymentLoading || isAutoPayLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
        <CardDescription>
          Secure payment processing powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeConnectError && (
          <PaymentError message={stripeConnectError} />
        )}
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
        <AutoPayToggle
          enabled={autoPayEnabled}
          onToggle={toggleAutoPay}
          disabled={isLoading || Boolean(stripeConnectError)}
        />
        <Button
          variant="outline"
          onClick={handleCustomerPortal}
          disabled={isLoading || !user || Boolean(stripeConnectError)}
          className="w-full"
        >
          Manage Payment Settings
        </Button>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePayment} 
          disabled={isLoading || !user || !monthlyRent || Boolean(stripeConnectError)}
          className="w-full"
        >
          {isLoading ? "Processing..." : `Pay $${monthlyRent || 0}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
