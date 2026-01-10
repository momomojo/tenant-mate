import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UnitWithTenant, TenantProfile } from "@/types";

interface TenantUnitWithProfile {
  id: string;
  status: string | null;
  profiles?: TenantProfile | null;
}

interface UnitsTableProps {
  units: UnitWithTenant[];
  onManageUnit: (unit: UnitWithTenant) => void;
  onAssignTenant: (unit: UnitWithTenant) => void;
  formatTenantLabel: (tenant: TenantProfile | null | undefined) => string;
}

export function UnitsTable({
  units,
  onManageUnit,
  onAssignTenant,
  formatTenantLabel,
}: UnitsTableProps) {
  return (
    <Table className="min-w-[650px]">
      <TableHeader>
        <TableRow>
          <TableHead className="text-gray-300">Unit Number</TableHead>
          <TableHead className="text-gray-300">Status</TableHead>
          <TableHead className="text-gray-300">Monthly Rent</TableHead>
          <TableHead className="text-gray-300">Current Tenant</TableHead>
          <TableHead className="text-gray-300">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units?.map((unit) => {
          const activeTenantUnit = unit.tenant_units?.find(
            (tu: TenantUnitWithProfile) => tu.status === "active"
          );
          const currentTenant = activeTenantUnit?.profiles;
          return (
            <TableRow key={unit.id}>
              <TableCell className="text-white">{unit.unit_number}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${unit.status === "occupied"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}
                >
                  {unit.status || "vacant"}
                </span>
              </TableCell>
              <TableCell className="text-white">${unit.monthly_rent}</TableCell>
              <TableCell className="text-white">
                {formatTenantLabel(currentTenant)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManageUnit(unit)}
                  >
                    Manage
                  </Button>
                  {!currentTenant && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssignTenant(unit)}
                    >
                      Assign Tenant
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}