
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentHistoryProps {
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    payment_method: string | null;
    invoice_number?: number;
    unit: {
      unit_number: string;
      property_id: string;
    };
  }>;
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="space-y-4"
              >
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h4 className="font-medium text-white">
                      Unit {payment.unit.unit_number}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Method: {payment.payment_method || "Manual"}
                    </p>
                    {payment.invoice_number && (
                      <p className="text-sm text-muted-foreground">
                        Invoice #: {payment.invoice_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      ${payment.amount}
                    </p>
                    <Badge
                      variant={payment.status === "paid" ? "default" : "secondary"}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Alert>
              <AlertDescription>
                No payment history found.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
