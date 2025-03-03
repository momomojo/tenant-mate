
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { usePaymentService } from '@/hooks/usePaymentService';
import { useRentDetails } from '@/hooks/useRentDetails';
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentFormProps {
  unitId: string;
  amount?: number;
}

export function PaymentForm({ unitId, amount: defaultAmount }: PaymentFormProps) {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuthenticatedUser();
  const { isLoading: isPaymentLoading, createPaymentRecord, viewPaymentSettings, validationStatus } = usePaymentService();
  const { monthlyRent } = useRentDetails(unitId, user);

  const handlePayment = async () => {
    if (!monthlyRent) {
      toast.error("Unable to process payment. Monthly rent amount not found.");
      return;
    }

    try {
      await createPaymentRecord(monthlyRent, unitId);
      toast.success("Payment record created. Please complete the payment manually.");
    } catch (error: any) {
      if (error.message.includes("No active session")) {
        toast.error("Your session has expired. Please login again.");
        navigate("/auth");
      }
    }
  };

  const handlePaymentSettings = async () => {
    try {
      await viewPaymentSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to access payment settings');
    }
  };

  const isLoading = isAuthLoading || isPaymentLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
        <CardDescription>
          Manual payment processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Alert>
          <AlertDescription>
            Stripe integration has been removed. This is a simplified payment form that only creates payment records.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          onClick={handlePaymentSettings}
          disabled={isLoading || !user}
          className="w-full"
        >
          Manage Payment Settings
        </Button>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePayment} 
          disabled={isLoading || !user || !monthlyRent}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${monthlyRent || defaultAmount || 0}`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
