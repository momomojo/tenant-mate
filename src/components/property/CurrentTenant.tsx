import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TenantProfile } from "@/types";

interface CurrentTenantProps {
  tenant: TenantProfile | null;
  onEndLease: () => void;
  formatTenantLabel: (tenant: TenantProfile | null) => string;
}

export function CurrentTenant({ tenant, onEndLease, formatTenantLabel }: CurrentTenantProps) {
  if (!tenant) return null;

  return (
    <div className="space-y-2 border-t pt-4">
      <Label>Current Tenant</Label>
      <div className="text-sm text-gray-500">
        {formatTenantLabel(tenant)}
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={onEndLease}
        className="mt-2"
      >
        End Lease
      </Button>
    </div>
  );
}