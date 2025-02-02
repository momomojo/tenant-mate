import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LateFeeDisplay } from "./LateFeeDisplay";

interface PaymentReceiptProps {
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    invoice_number: number;
    unit: {
      unit_number: string;
      property_id: string;
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
      a.download = `receipt-${payment.invoice_number}.pdf`;
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
        <CardTitle className="text-sm font-medium">Payment Receipt #{payment.invoice_number}</CardTitle>
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
          <p className="text-sm text-muted-foreground">
            Status: <span className={`font-medium ${payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
          </p>
          
          <LateFeeDisplay 
            amount={payment.amount}
            dueDate={payment.payment_date}
            propertyId={payment.unit.property_id}
          />
          
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
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