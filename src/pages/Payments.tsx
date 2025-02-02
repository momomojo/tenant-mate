import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PaymentHistory } from "@/components/tenant/PaymentHistory";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";
import { toast } from "sonner";

const Payments = () => {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (success) {
      toast.success("Payment successful!");
    }
    if (canceled) {
      toast.error("Payment canceled.");
    }
  }, [success, canceled]);

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("rent_payments")
        .select(`
          id,
          amount,
          payment_date,
          status,
          payment_method,
          unit:units(unit_number)
        `)
        .eq("tenant_id", user.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: activeUnit, isLoading: isLoadingUnit } = useQuery({
    queryKey: ["active-unit"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("tenant_units")
        .select(`
          unit_id,
          unit:units(id, unit_number, monthly_rent)
        `)
        .eq("tenant_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (isLoadingPayments || isLoadingUnit) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      {success && (
        <Alert className="bg-green-500/15 text-green-500 border-green-500/50">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Payment successful! Your payment has been processed.
          </AlertDescription>
        </Alert>
      )}
      
      {canceled && (
        <Alert className="bg-red-500/15 text-red-500 border-red-500/50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Payment was canceled. Please try again if you wish to complete the payment.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeUnit ? (
            <PaymentForm
              unitId={activeUnit.unit_id}
              amount={activeUnit.unit.monthly_rent}
            />
          ) : (
            <Alert>
              <AlertDescription>
                No active lease found. Please contact your property manager if you believe this is an error.
              </AlertDescription>
            </Alert>
          )}
          {payments && <PaymentHistory payments={payments} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;