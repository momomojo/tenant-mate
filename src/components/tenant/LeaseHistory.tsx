import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

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
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lease History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {leases.map((lease, index) => (
            <div
              key={lease.id}
              className="flex items-start gap-4 pb-6 last:pb-0"
            >
              {index < leases.length - 1 && (
                <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-border" />
              )}
              <div className="relative z-10 mt-1 rounded-full bg-background p-1 ring-2 ring-border">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-white">
                  {lease.unit.property.name} - Unit {lease.unit.unit_number}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(lease.lease_start_date).toLocaleDateString()} -{" "}
                  {new Date(lease.lease_end_date).toLocaleDateString()}
                </p>
                <Badge
                  variant={lease.status === "active" ? "default" : "secondary"}
                  className="mt-2"
                >
                  {lease.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}