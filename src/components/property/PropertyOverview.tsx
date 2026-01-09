import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import type { PropertyWithUnits, Unit } from "@/types";

interface PropertyOverviewProps {
  property: PropertyWithUnits;
}

export function PropertyOverview({ property }: PropertyOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="bg-[#403E43] border-none">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">
            Units Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#9b87f5]" />
            <span className="text-sm text-gray-300">
              {property.units?.length || 0} Total Units
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Users className="h-4 w-4 text-[#9b87f5]" />
            <span className="text-sm text-gray-300">
              {property.units?.filter((unit: Unit) => unit.status === "occupied")
                .length || 0}{" "}
              Occupied Units
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}