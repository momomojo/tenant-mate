import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface LateFeeDisplayProps {
  amount: number;
  dueDate: string;
  propertyId: string;
}

export function LateFeeDisplay({ amount, dueDate, propertyId }: LateFeeDisplayProps) {
  const { data: lateFeeInfo } = useQuery({
    queryKey: ["lateFee", amount, dueDate, propertyId],
    queryFn: async () => {
      // Get payment config for grace period info, using maybeSingle() instead of single()
      const { data: config } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('property_id', propertyId)
        .maybeSingle();

      // Use default values if no config exists
      const gracePeriodDays = config?.grace_period_days ?? 5;
      const lateFeePercentage = config?.late_fee_percentage ?? 5;

      // Calculate late fee
      const { data: lateFee, error } = await supabase.rpc('calculate_late_fee', {
        payment_amount: amount,
        due_date: dueDate,
        property_id: propertyId
      });

      if (error) throw error;

      const daysLate = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 3600 * 24));

      return {
        lateFee,
        gracePeriod: gracePeriodDays,
        lateFeePercentage: lateFeePercentage,
        daysLate
      };
    },
  });

  if (!lateFeeInfo || lateFeeInfo.lateFee === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Late Payment Fee Applied
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {lateFeeInfo.daysLate} days late (Grace period: {lateFeeInfo.gracePeriod} days)
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>Due date: {new Date(dueDate).toLocaleDateString()}</span>
        </div>
        <p className="text-sm font-medium mt-2">
          Late fee ({lateFeeInfo.lateFeePercentage}%): ${lateFeeInfo.lateFee}
        </p>
        <p className="text-sm text-muted">
          Total amount due: ${(amount + lateFeeInfo.lateFee).toFixed(2)}
        </p>
      </AlertDescription>
    </Alert>
  );
}