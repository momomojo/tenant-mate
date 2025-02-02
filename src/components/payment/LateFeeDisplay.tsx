import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface LateFeeDisplayProps {
  amount: number;
  dueDate: string;
  propertyId: string;
}

export function LateFeeDisplay({ amount, dueDate, propertyId }: LateFeeDisplayProps) {
  const { data: lateFee } = useQuery({
    queryKey: ["lateFee", amount, dueDate, propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_late_fee', {
        payment_amount: amount,
        due_date: dueDate,
        property_id: propertyId
      });

      if (error) throw error;
      return data;
    },
  });

  if (!lateFee) return null;

  return lateFee > 0 ? (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        A late fee of ${lateFee} has been applied to this payment
      </AlertDescription>
    </Alert>
  ) : null;
}