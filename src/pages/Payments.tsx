import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PaymentHistory } from "@/components/tenant/PaymentHistory";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const Payments = () => {
  const { data: payments, isLoading } = useQuery({
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

  const { data: activeUnit } = useQuery({
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
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeUnit && (
            <PaymentForm
              unitId={activeUnit.unit_id}
              amount={activeUnit.unit.monthly_rent}
            />
          )}
          {payments && <PaymentHistory payments={payments} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;