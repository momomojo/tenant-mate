
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

interface StripeAccountActionsProps {
  isVerified: boolean;
  isLoading: boolean;
  remediationLink?: string;
  onDashboardOpen: () => void;
  onSetupComplete: () => void;
}

export const StripeAccountActions = ({
  isVerified,
  isLoading,
  remediationLink,
  onDashboardOpen,
  onSetupComplete,
}: StripeAccountActionsProps) => {
  const handleSetupClick = () => {
    if (remediationLink) {
      window.open(remediationLink, '_blank');
    } else {
      onSetupComplete();
    }
  };

  const handleDashboardClick = () => {
    onDashboardOpen();
  };

  return (
    <div className="flex flex-col gap-2 pt-4">
      {isVerified && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleDashboardClick}
        >
          Open Stripe Dashboard
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      )}

      {!isVerified && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleSetupClick}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Complete Account Setup
              <ExternalLink className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};
