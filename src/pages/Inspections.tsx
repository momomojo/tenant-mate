import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  useInspections,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  useInspectionCounts,
  inspectionTypeConfig,
  inspectionStatusConfig,
  type Inspection,
  type InspectionType,
  type InspectionStatus,
  type InspectionFilters,
} from "@/hooks/useInspections";
import { useProperties } from "@/hooks/useProperties";
import { useUnits } from "@/hooks/useUnits";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Plus,
  Calendar,
  Building2,
  Home,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Filter,
  FileText,
} from "lucide-react";

const formSchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  unit_id: z.string().min(1, "Unit is required"),
  inspection_type: z.string().min(1, "Type is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  inspector_notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Inspections() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filters, setFilters] = useState<InspectionFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<string | null>(null);

  const { data: inspections, isLoading } = useInspections(filters);
  const { data: properties } = useProperties();
  const { data: counts } = useInspectionCounts(filters.propertyId);
  const { mutate: createInspection, isPending: isCreating } = useCreateInspection();
  const { mutate: updateInspection, isPending: isUpdating } = useUpdateInspection();
  const { mutate: deleteInspection } = useDeleteInspection();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_id: "",
      unit_id: "",
      inspection_type: "",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      inspector_notes: "",
    },
  });

  const selectedPropertyId = form.watch("property_id");
  const { data: units } = useUnits(selectedPropertyId || undefined);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleOpenDialog = (inspection?: Inspection) => {
    if (inspection) {
      setEditingInspection(inspection);
      form.reset({
        property_id: inspection.property_id,
        unit_id: inspection.unit_id,
        inspection_type: inspection.inspection_type,
        scheduled_date: inspection.scheduled_date || format(new Date(), "yyyy-MM-dd"),
        inspector_notes: inspection.inspector_notes || "",
      });
    } else {
      setEditingInspection(null);
      form.reset({
        property_id: filters.propertyId || "",
        unit_id: "",
        inspection_type: "",
        scheduled_date: format(new Date(), "yyyy-MM-dd"),
        inspector_notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (data: FormData) => {
    if (editingInspection) {
      updateInspection(
        {
          id: editingInspection.id,
          ...data,
          inspection_type: data.inspection_type as InspectionType,
        },
        {
          onSuccess: () => {
            toast({ title: "Inspection updated" });
            setDialogOpen(false);
            setEditingInspection(null);
          },
          onError: () => {
            toast({ title: "Failed to update inspection", variant: "destructive" });
          },
        }
      );
    } else {
      createInspection(
        {
          ...data,
          inspection_type: data.inspection_type as InspectionType,
        },
        {
          onSuccess: () => {
            toast({ title: "Inspection scheduled" });
            setDialogOpen(false);
          },
          onError: () => {
            toast({ title: "Failed to schedule inspection", variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (inspectionToDelete) {
      deleteInspection(inspectionToDelete, {
        onSuccess: () => {
          toast({ title: "Inspection deleted" });
          setDeleteDialogOpen(false);
          setInspectionToDelete(null);
        },
        onError: () => {
          toast({ title: "Failed to delete inspection", variant: "destructive" });
        },
      });
    }
  };

  const handleStatusUpdate = (inspectionId: string, status: InspectionStatus) => {
    updateInspection(
      {
        id: inspectionId,
        status,
        completed_date: status === "completed" ? format(new Date(), "yyyy-MM-dd") : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: `Inspection marked as ${status}` });
        },
      }
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <TopBar />
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Inspections</h1>
                <p className="text-muted-foreground">
                  Manage property condition reports and inspections
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Inspection
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingInspection ? "Edit Inspection" : "Schedule Inspection"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    {/* Property */}
                    <div className="space-y-2">
                      <Label>Property *</Label>
                      <Controller
                        name="property_id"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              form.setValue("unit_id", "");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Unit */}
                    <div className="space-y-2">
                      <Label>Unit *</Label>
                      <Controller
                        name="unit_id"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedPropertyId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units?.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  Unit {u.unit_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Type and Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Inspection Type *</Label>
                        <Controller
                          name="inspection_type"
                          control={form.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(inspectionTypeConfig).map(
                                  ([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      {config.label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Scheduled Date *</Label>
                        <Input
                          type="date"
                          {...form.register("scheduled_date")}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Any notes for this inspection..."
                        {...form.register("inspector_notes")}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreating || isUpdating}>
                        {editingInspection ? "Update" : "Schedule"} Inspection
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{counts?.total || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Scheduled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold">{counts?.scheduled || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-600" />
                    <span className="text-2xl font-bold">{counts?.in_progress || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">{counts?.completed || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select
                value={filters.propertyId || "__all__"}
                onValueChange={(v) =>
                  setFilters({ ...filters, propertyId: v === "__all__" ? undefined : v })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Properties</SelectItem>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.type || "__all__"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    type: v === "__all__" ? undefined : (v as InspectionType),
                  })
                }
              >
                <SelectTrigger className="w-[160px]">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types</SelectItem>
                  {Object.entries(inspectionTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status || "__all__"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    status: v === "__all__" ? undefined : (v as InspectionStatus),
                  })
                }
              >
                <SelectTrigger className="w-[160px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  {Object.entries(inspectionStatusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inspection List */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : inspections?.length === 0 ? (
              <Card className="p-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium">No inspections found</h3>
                <p className="text-muted-foreground mt-1">
                  Schedule your first inspection to start tracking property conditions
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inspections?.map((inspection) => {
                  const typeConfig =
                    inspectionTypeConfig[inspection.inspection_type];
                  const statusConfig =
                    inspectionStatusConfig[inspection.status];

                  return (
                    <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {inspection.property?.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Home className="h-3 w-3" />
                              Unit {inspection.unit?.unit_number}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge className={`${typeConfig?.color} text-white`}>
                              {typeConfig?.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {statusConfig?.label}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {inspection.scheduled_date
                            ? format(new Date(inspection.scheduled_date), "MMM d, yyyy")
                            : "Not scheduled"}
                        </div>

                        {inspection.tenant && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            {inspection.tenant.first_name} {inspection.tenant.last_name}
                          </div>
                        )}

                        {inspection.inspector_notes && (
                          <p className="text-sm text-muted-foreground truncate">
                            {inspection.inspector_notes}
                          </p>
                        )}

                        <div className="flex gap-2 pt-2">
                          {inspection.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(inspection.id, "in_progress")
                              }
                            >
                              Start
                            </Button>
                          )}
                          {inspection.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(inspection.id, "completed")
                              }
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(inspection)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setInspectionToDelete(inspection.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
