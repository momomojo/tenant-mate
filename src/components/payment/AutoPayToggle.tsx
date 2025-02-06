
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AutoPayToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function AutoPayToggle({ enabled, onToggle, disabled }: AutoPayToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="autopay"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
      <Label htmlFor="autopay">Enable automatic monthly payments</Label>
    </div>
  );
}
