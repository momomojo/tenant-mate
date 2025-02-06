
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface VerificationRequirement {
  current_deadline: number;
  currently_due: string[];
  eventually_due: string[];
  past_due: string[];
  pending_verification: string[];
  errors?: Array<{
    code: string;
    reason: string;
  }>;
}

interface StripeAccountStatusProps {
  isVerified: boolean;
  hasRequirements: boolean;
  verificationDetails?: {
    requirements?: VerificationRequirement;
    status: string;
    verificationStatus: string;
    lastUpdated?: string;
  };
}

export const StripeAccountStatus = ({ 
  isVerified, 
  hasRequirements, 
  verificationDetails 
}: StripeAccountStatusProps) => {
  const formatRequirementName = (requirement: string) => {
    return requirement
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isVerified) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-800">Account Verified</AlertTitle>
        <AlertDescription className="text-green-700">
          Your Stripe account is verified and ready to accept payments
        </AlertDescription>
      </Alert>
    );
  }

  if (hasRequirements && verificationDetails?.requirements) {
    const { requirements } = verificationDetails;
    return (
      <Alert variant="destructive" className="space-y-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-1" />
          <div>
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Your Stripe account needs additional information before you can accept payments
            </AlertDescription>
          </div>
        </div>

        {requirements.currently_due.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Required Now:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {requirements.currently_due.map((req) => (
                <li key={req} className="text-sm">
                  {formatRequirementName(req)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {requirements.eventually_due.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Required Soon:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {requirements.eventually_due.map((req) => (
                  <li key={req} className="text-sm">
                    {formatRequirementName(req)}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {requirements.errors && requirements.errors.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Verification Errors:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {requirements.errors.map((error) => (
                  <li key={error.code} className="text-sm">
                    {error.reason}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {verificationDetails.lastUpdated && (
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
            <Clock className="h-3 w-3" />
            Last updated: {new Date(verificationDetails.lastUpdated).toLocaleString()}
          </div>
        )}
      </Alert>
    );
  }

  return null;
};
