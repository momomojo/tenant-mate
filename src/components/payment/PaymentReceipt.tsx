import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface PaymentReceiptProps {
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    unit: {
      unit_number: string;
    };
  };
}

export function PaymentReceipt({ payment }: PaymentReceiptProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/generate-receipt?paymentId=${payment.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${payment.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payment Receipt</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Amount: ${payment.amount}
          </p>
          <p className="text-sm text-muted-foreground">
            Date: {new Date(payment.payment_date).toLocaleDateString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Unit: {payment.unit.unit_number}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}