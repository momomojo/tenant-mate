
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { usePaymentService } from '@/hooks/usePaymentService';
import { useAutoPayment } from '@/hooks/useAutoPayment';
import { useRentDetails } from '@/hooks/useRentDetails';
import { AutoPayToggle } from './AutoPayToggle';
import { PaymentError } from './PaymentError';

interface PaymentFormProps {
  unitId: string;
  amount?: number;
}

export function PaymentForm({ unitId, amount: defaultAmount }: PaymentFormProps) {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuthenticatedUser();
  const { isLoading: isPaymentLoading, createCheckoutSession, createPortalSession } = usePaymentService();
  const { isEnabled: autoPayEnabled, isLoading: isAutoPayLoading, toggleAutoPay } = 
    useAutoPayment(unitId, user?.id);
  const { monthlyRent, stripeConnectError } = useRentDetails(unitId, user);

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
        window.open(url, '_blank');
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
        window.open(url, '_blank');
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
            value={monthlyRent || defaultAmount || 0}
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
          {isLoading ? "Processing..." : `Pay $${monthlyRent || defaultAmount || 0}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
