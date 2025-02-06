
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Download, Printer } from "lucide-react";
import { LateFeeDisplay } from "@/components/payment/LateFeeDisplay";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { useEffect, useState } from "react";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { toast } from "sonner";

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
  const { user } = useAuthenticatedUser();
  const { generateReceipt } = usePaymentHistory(user?.id);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);

  const handleDownload = async (paymentId: string) => {
    try {
      setGeneratingReceipt(paymentId);
      const receiptUrl = await generateReceipt(paymentId);
      if (receiptUrl) {
        window.open(receiptUrl, '_blank');
      }
    } finally {
      setGeneratingReceipt(null);
    }
  };

  const handlePrint = (paymentId: string) => {
    window.print();
  };

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
              
              <LateFeeDisplay 
                amount={payment.amount}
                dueDate={payment.payment_date}
                propertyId={payment.unit.property_id}
              />
              
              {payment.status === "paid" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(payment.id)}
                    disabled={generatingReceipt === payment.id}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generatingReceipt === payment.id ? "Generating..." : "Download Receipt"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 print:hidden"
                    onClick={() => handlePrint(payment.id)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
