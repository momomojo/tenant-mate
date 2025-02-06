
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

interface StripeAccountActionsProps {
  isVerified: boolean;
  isLoading: boolean;
  onDashboardOpen: () => void;
  onSetupComplete: () => void;
}

export const StripeAccountActions = ({
  isVerified,
  isLoading,
  onDashboardOpen,
  onSetupComplete,
}: StripeAccountActionsProps) => {
  return (
    <div className="flex flex-col gap-2 pt-4">
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={onDashboardOpen}
      >
        Open Stripe Dashboard
        <ExternalLink className="ml-2 h-4 w-4" />
      </Button>

      {!isVerified && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onSetupComplete}
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
