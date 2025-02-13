
import { Separator } from "@/components/ui/separator";
import { StripeRequirementItem } from "./StripeRequirementItem";

interface StripeRequirementGroupProps {
  category: string;
  requirements: string[];
  pastDueRequirements: string[];
  isLastGroup: boolean;
  onItemClick: (requirement: string) => void;
}

export const StripeRequirementGroup = ({
  category,
  requirements,
  pastDueRequirements,
  isLastGroup,
  onItemClick,
}: StripeRequirementGroupProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
      <div className="space-y-2">
        {requirements.map((req) => (
          <StripeRequirementItem
            key={req}
            requirement={req}
            isPastDue={pastDueRequirements.includes(req)}
            onClick={() => onItemClick(req)}
          />
        ))}
      </div>
      {!isLastGroup && <Separator className="my-4" />}
    </div>
  );
};
