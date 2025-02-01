import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <CardTitle>Maintenance History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border-b border-gray-700 pb-4 last:border-0"
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
              <p className="mt-1 text-sm text-gray-400">
                Unit {request.unit.unit_number}
              </p>
              <p className="mt-2 text-sm text-gray-300">{request.description}</p>
              <p className="mt-1 text-xs text-gray-400">
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