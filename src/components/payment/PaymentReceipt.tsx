import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LateFeeDisplay } from "./LateFeeDisplay";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      // Validate user with server before proceeding
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to download receipt");
        return;
      }

      // getSession() is needed here for the access_token used in the Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-receipt?paymentId=${payment.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate receipt');
      }

      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${payment.invoice_number}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error("Failed to download receipt");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="print:shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payment Receipt #{payment.invoice_number}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-lg">${payment.amount}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="text-lg">{new Date(payment.payment_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unit</p>
              <p className="text-lg">{payment.unit.unit_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className={`text-lg font-medium ${getStatusColor(payment.status)}`}>
                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </p>
            </div>
          </div>
          
          <LateFeeDisplay 
            amount={payment.amount}
            dueDate={payment.payment_date}
            propertyId={payment.unit.property_id}
          />
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 print:hidden"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}