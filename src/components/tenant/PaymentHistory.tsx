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
                    Method: {payment.payment_method || "N/A"}
                  </p>
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
              
              <LateFeeDisplay 
                amount={payment.amount}
                dueDate={payment.payment_date}
                propertyId={payment.unit.property_id}
              />
              
              {payment.status === "paid" && (
                <PaymentReceipt payment={payment} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}