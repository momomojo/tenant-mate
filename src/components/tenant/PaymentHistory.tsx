import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentHistoryProps {
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    payment_method: string | null;
    unit: {
      unit_number: string;
    };
  }>;
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between border-b border-gray-700 pb-4 last:border-0"
            >
              <div>
                <h4 className="font-medium text-white">
                  Unit {payment.unit.unit_number}
                </h4>
                <p className="text-sm text-gray-400">
                  {new Date(payment.payment_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-400">
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}