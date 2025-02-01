import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, History, ArchiveRestore } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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
  tenantId: string;
}

export function LeaseHistory({ leases, tenantId }: LeaseHistoryProps) {
  const queryClient = useQueryClient();

  const { data: deletedLeases, isLoading: isLoadingDeleted } = useQuery({
    queryKey: ["deletedLeases", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deleted_tenant_units")
        .select(`
          id,
          lease_start_date,
          lease_end_date,
          status,
          deleted_at,
          deleted_by (
            first_name,
            last_name
          ),
          unit:units (
            unit_number,
            property:properties (
              name
            )
          )
        `)
        .eq("tenant_id", tenantId)
        .order("deleted_at", { ascending: false });

      if (error) {
        console.error("Error fetching deleted leases:", error);
        throw error;
      }

      return data;
    },
  });

  const restoreLeaseMutation = useMutation({
    mutationFn: async (lease: any) => {
      const { error: insertError } = await supabase
        .from("tenant_units")
        .insert({
          tenant_id: tenantId,
          unit_id: lease.unit_id,
          lease_start_date: lease.lease_start_date,
          lease_end_date: lease.lease_end_date,
          status: lease.status,
        });

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("deleted_tenant_units")
        .delete()
        .eq("id", lease.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success("Lease restored successfully");
      queryClient.invalidateQueries({ queryKey: ["deletedLeases"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
    },
    onError: (error) => {
      console.error("Error restoring lease:", error);
      toast.error("Failed to restore lease");
    },
  });

  const renderLeaseTimeline = (
    leaseData: any[],
    isDeleted: boolean = false
  ) => (
    <div className="relative space-y-6">
      {leaseData?.map((lease, index) => (
        <div
          key={lease.id}
          className="flex items-start gap-4 pb-6 last:pb-0"
        >
          {index < leaseData.length - 1 && (
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant={lease.status === "active" ? "default" : "secondary"}
              >
                {lease.status}
              </Badge>
              {isDeleted && (
                <>
                  <Badge variant="destructive">Deleted</Badge>
                  <p className="text-sm text-muted-foreground">
                    Deleted by: {lease.deleted_by.first_name}{" "}
                    {lease.deleted_by.last_name} on{" "}
                    {new Date(lease.deleted_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => restoreLeaseMutation.mutate(lease)}
                    disabled={restoreLeaseMutation.isPending}
                  >
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Restore Lease
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lease History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active History
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex-1">
              <History className="mr-2 h-4 w-4" />
              Deleted History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {renderLeaseTimeline(leases)}
          </TabsContent>
          <TabsContent value="deleted">
            {isLoadingDeleted ? (
              <p className="text-center text-muted-foreground">
                Loading deleted leases...
              </p>
            ) : (
              renderLeaseTimeline(deletedLeases, true)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}