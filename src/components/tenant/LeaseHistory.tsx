import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeaseHistoryProps {
  leases: Array<{
    id: string;
    unit: {
      unit_number: string;
      property: {
        name: string;
      };
    };
    lease_start_date: string;
    lease_end_date: string;
    status: string;
  }>;
}

export function LeaseHistory({ leases }: LeaseHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lease History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {leases.map((lease) => (
            <div
              key={lease.id}
              className="flex items-center justify-between border-b border-gray-700 pb-4 last:border-0"
            >
              <div>
                <h4 className="font-medium text-white">
                  {lease.unit.property.name} - Unit {lease.unit.unit_number}
                </h4>
                <p className="text-sm text-gray-400">
                  {new Date(lease.lease_start_date).toLocaleDateString()} -{" "}
                  {new Date(lease.lease_end_date).toLocaleDateString()}
                </p>
              </div>
              <Badge
                variant={lease.status === "active" ? "default" : "secondary"}
              >
                {lease.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}