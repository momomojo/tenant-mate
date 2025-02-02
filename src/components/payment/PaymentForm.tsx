import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentFormProps {
  unitId: string;
  amount: number;
}

export function PaymentForm({ unitId, amount }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please login to make a payment");
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke('create-checkout-session', {
        body: { amount, unit_id: unitId }
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
      toast.error("Failed to initiate payment");
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
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            value={amount}
            readOnly
            type="number"
            className="bg-muted"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePayment} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Processing..." : `Pay $${amount}`}
        </Button>
      </CardFooter>
    </Card>
  );
}