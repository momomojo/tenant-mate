import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { PaymentReceipt } from "@/components/payment/PaymentReceipt";
import { LateFeeDisplay } from "@/components/payment/LateFeeDisplay";

interface PaymentHistoryProps {
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    payment_method: string | null;
    invoice_number?: number; // Made optional since it might not always be present
    unit: {
      unit_number: string;
      property_id: string;
    };
  }>;
}

// Helper function to get badge variant based on payment status
function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "paid":
      return "default";
    case "pending":
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

// Helper function to format payment method display
function formatPaymentMethod(method: string | null): string {
  if (!method) return "N/A";
  switch (method.toLowerCase()) {
    case "card":
      return "Credit/Debit Card";
    case "ach":
      return "Bank Transfer (ACH)";
    default:
      return method.charAt(0).toUpperCase() + method.slice(1);
  }
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
          {payments.map((payment) => (
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
                    Method: {formatPaymentMethod(payment.payment_method)}
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
                  <Badge variant={getStatusBadgeVariant(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <LateFeeDisplay 
                amount={payment.amount}
                dueDate={payment.payment_date}
                propertyId={payment.unit.property_id}
              />
              
              {payment.status === "paid" && (
                <PaymentReceipt payment={{
                  ...payment,
                  invoice_number: payment.invoice_number || 0 // Provide a default value
                }} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}