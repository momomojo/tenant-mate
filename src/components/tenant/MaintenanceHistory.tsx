import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

interface MaintenanceHistoryProps {
  requests: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    unit: {
      unit_number: string;
    };
  }>;
}

export function MaintenanceHistory({ requests }: MaintenanceHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">{request.title}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline">{request.priority}</Badge>
                  <Badge
                    variant={
                      request.status === "completed" ? "default" : "secondary"
                    }
                  >
                    {request.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Unit {request.unit.unit_number}
              </p>
              <p className="text-sm text-gray-300">{request.description}</p>
              <p className="text-xs text-muted-foreground">
                Submitted on{" "}
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}