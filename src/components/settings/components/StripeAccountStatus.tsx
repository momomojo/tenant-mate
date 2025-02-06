
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface StripeAccountStatusProps {
  isVerified: boolean;
  hasRequirements: boolean;
}

export const StripeAccountStatus = ({ isVerified, hasRequirements }: StripeAccountStatusProps) => {
  if (isVerified) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Account Verified</AlertTitle>
        <AlertDescription>
          Your Stripe account is verified and ready to accept payments
        </AlertDescription>
      </Alert>
    );
  }

  if (hasRequirements) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Action Required</AlertTitle>
        <AlertDescription>
          Your Stripe account needs additional information before you can accept payments
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
