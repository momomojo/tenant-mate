
import { ChevronRight } from "lucide-react";

interface StripeRequirementItemProps {
  requirement: string;
  isPastDue: boolean;
  onClick: () => void;
}

export const formatRequirementKey = (key: string) => {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  return lastPart
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const StripeRequirementItem = ({ requirement, isPastDue, onClick }: StripeRequirementItemProps) => {
  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{formatRequirementKey(requirement)}</p>
          {isPastDue && (
            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
              Past due
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
};
