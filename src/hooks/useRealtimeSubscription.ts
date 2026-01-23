import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

type TableName =
  | "notifications"
  | "maintenance_requests"
  | "rent_payments"
  | "tenant_units"
  | "properties"
  | "units";

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  userId?: string;
  onNotification?: (notification: Record<string, unknown>) => void;
}

export function useRealtimeSubscription({
  tables,
  userId,
  onNotification,
}: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to each table
    tables.forEach((table) => {
      const channel = supabase
        .channel(`${table}-changes-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
            filter: getFilterForTable(table, userId),
          },
          (payload) => {
            // Invalidate relevant queries
            invalidateQueriesForTable(queryClient, table, payload);

            // Handle notifications specially
            if (table === "notifications" && payload.eventType === "INSERT") {
              if (onNotification) {
                onNotification(payload.new);
              }
              // Show toast for new notifications
              const newNotification = payload.new as Record<string, unknown>;
              if (newNotification?.title) {
                toast(newNotification.title, {
                  description: newNotification.message,
                });
              }
            }
          }
        )
        .subscribe();

      channels.push(channel);
    });

    // Cleanup subscriptions
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, userId, queryClient, onNotification]);
}

function getFilterForTable(table: TableName, userId: string): string | undefined {
  switch (table) {
    case "notifications":
      return `user_id=eq.${userId}`;
    case "maintenance_requests":
      return `tenant_id=eq.${userId}`;
    case "rent_payments":
      return `tenant_id=eq.${userId}`;
    case "tenant_units":
      return `tenant_id=eq.${userId}`;
    default:
      return undefined;
  }
}

function invalidateQueriesForTable(
  queryClient: ReturnType<typeof useQueryClient>,
  table: TableName,
  _payload: unknown
) {
  switch (table) {
    case "notifications":
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      break;
    case "maintenance_requests":
      queryClient.invalidateQueries({ queryKey: ["maintenanceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tenantMaintenanceCount"] });
      queryClient.invalidateQueries({ queryKey: ["pmDashboardStats"] });
      break;
    case "rent_payments":
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["rentRoll"] });
      queryClient.invalidateQueries({ queryKey: ["incomeReport"] });
      break;
    case "tenant_units":
      queryClient.invalidateQueries({ queryKey: ["tenantUnits"] });
      queryClient.invalidateQueries({ queryKey: ["pmDashboardStats"] });
      break;
    case "properties":
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["pmDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["propertySummary"] });
      break;
    case "units":
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["pmDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["rentRoll"] });
      break;
  }
}
