import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellAlert, CalendarClock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PaymentAlerts() {
  const { data: activeLeases } = useQuery({
    queryKey: ["active-leases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("tenant_units")
        .select(`
          unit_id,
          unit:units (
            unit_number,
            monthly_rent,
            property_id
          )
        `)
        .eq("tenant_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const { data: lateFees } = useQuery({
    queryKey: ["late-fees", activeLeases],
    enabled: !!activeLeases?.length,
    queryFn: async () => {
      if (!activeLeases) return [];
      
      const feesPromises = activeLeases.map(async (lease) => {
        const { data, error } = await supabase.rpc('calculate_late_fee', {
          payment_amount: lease.unit.monthly_rent,
          due_date: new Date().toISOString(), // This should be replaced with actual due date
          property_id: lease.unit.property_id
        });

        if (error) throw error;
        return {
          unitNumber: lease.unit.unit_number,
          lateFee: data
        };
      });

      return Promise.all(feesPromises);
    },
  });

  const hasLateFees = lateFees?.some(fee => fee.lateFee > 0);

  return (
    <div className="space-y-4">
      {hasLateFees && (
        <Alert variant="destructive">
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            You have pending late fees. Please check your payment status.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellAlert className="h-5 w-5" />
            Payment Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lateFees?.map((fee, index) => (
            fee.lateFee > 0 && (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Unit {fee.unitNumber}</p>
                    <p className="text-sm text-muted-foreground">Late Fee: ${fee.lateFee}</p>
                  </div>
                </div>
              </div>
            )
          ))}
          {!hasLateFees && (
            <p className="text-muted-foreground text-sm">No pending late fees</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}