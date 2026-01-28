import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Wrench, Info } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";

const Maintenance = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: "",
    description: "",
    priority: "medium",
    unit_id: "",
  });

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isPropertyManager = userProfile?.role === "property_manager" || userProfile?.role === "admin";

  // Get units for tenant (their assigned units) or property manager (all their units)
  const { data: units } = useQuery({
    queryKey: ["maintenanceUnits", user?.id],
    queryFn: async () => {
      if (isPropertyManager) {
        const { data, error } = await supabase
          .from("units")
          .select(`
            id,
            unit_number,
            property:properties(name)
          `)
          .order("unit_number");
        if (error) throw error;
        return data;
      } else {
        // Tenant - get their assigned units
        const { data, error } = await supabase
          .from("tenant_units")
          .select(`
            unit:units(
              id,
              unit_number,
              property:properties(name)
            )
          `)
          .eq("tenant_id", user?.id)
          .eq("status", "active");
        if (error) throw error;
        return data?.map(tu => tu.unit) || [];
      }
    },
    enabled: !!user && userProfile !== undefined,
  });

  const { data: maintenanceRequests, isLoading } = useQuery({
    queryKey: ["maintenanceRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(`
          *,
          unit:units(
            unit_number,
            property:properties(name)
          ),
          tenant:profiles!maintenance_requests_tenant_id_fkey(
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (request: typeof newRequest) => {
      const { error } = await supabase.from("maintenance_requests").insert({
        tenant_id: user?.id,
        unit_id: request.unit_id,
        title: request.title,
        description: request.description,
        priority: request.priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceRequests"] });
      toast({ title: "Success", description: "Maintenance request submitted" });
      setIsDialogOpen(false);
      setNewRequest({ title: "", description: "", priority: "medium", unit_id: "" });
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceRequests"] });
      toast({ title: "Success", description: "Status updated" });
    },
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-gray-500",
    };
    return (
      <Badge className={`${colors[status] || "bg-gray-500"} text-white`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-400",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      urgent: "bg-red-500",
    };
    return (
      <Badge className={`${colors[priority] || "bg-gray-400"} text-white`}>
        {priority}
      </Badge>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TopBar
                title="Maintenance Requests"
                subtitle={isPropertyManager ? "Manage maintenance requests" : "Submit and track maintenance requests"}
              />
              {!isPropertyManager && units && units.length > 0 && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Maintenance Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Unit</Label>
                        <Select
                          value={newRequest.unit_id}
                          onValueChange={(v) => setNewRequest({ ...newRequest, unit_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {units?.map((unit: any) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.property?.name} - Unit {unit.unit_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={newRequest.title}
                          onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                          placeholder="Brief description of the issue"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newRequest.description}
                          onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                          placeholder="Detailed description of the issue"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={newRequest.priority}
                          onValueChange={(v) => setNewRequest({ ...newRequest, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createMutation.mutate(newRequest)}
                        disabled={!newRequest.title || !newRequest.unit_id || createMutation.isPending}
                        className="w-full"
                      >
                        Submit Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Show helpful message for tenants without assigned units */}
            {!isPropertyManager && (!units || units.length === 0) && userProfile !== undefined && (
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-400">No Units Assigned</AlertTitle>
                <AlertDescription className="text-gray-300">
                  You need to be assigned to a unit before you can submit maintenance requests.
                  Please contact your property manager to get assigned to your unit.
                </AlertDescription>
              </Alert>
            )}

            <Card className="glass-card overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : maintenanceRequests && maintenanceRequests.length > 0 ? (
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-300">Title</TableHead>
                      <TableHead className="text-gray-300">Unit</TableHead>
                      {isPropertyManager && <TableHead className="text-gray-300">Tenant</TableHead>}
                      <TableHead className="text-gray-300">Priority</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      {isPropertyManager && <TableHead className="text-gray-300">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-white font-medium">
                          {request.title}
                          <p className="text-sm text-gray-400 mt-1">{request.description}</p>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {request.unit?.property?.name} - Unit {request.unit?.unit_number}
                        </TableCell>
                        {isPropertyManager && (
                          <TableCell className="text-gray-300">
                            {request.tenant?.first_name} {request.tenant?.last_name}
                          </TableCell>
                        )}
                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        {isPropertyManager && (
                          <TableCell>
                            <Select
                              value={request.status}
                              onValueChange={(v) => updateStatusMutation.mutate({ id: request.id, status: v })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <Wrench className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No maintenance requests yet</p>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Maintenance;
