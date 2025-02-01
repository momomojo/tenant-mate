import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { ArrowLeft, Building2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface AddUnitForm {
  unit_number: string;
  monthly_rent: number;
}

interface ManageUnitForm {
  unit_number: string;
  monthly_rent: number;
  status: string;
}

interface AssignTenantForm {
  tenant_id: string;
  lease_start_date: Date;
  lease_end_date: Date;
}

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isManagingUnit, setIsManagingUnit] = useState(false);
  const [isAssigningTenant, setIsAssigningTenant] = useState(false);
  const [selectedLeaseStartDate, setSelectedLeaseStartDate] = useState<Date>();
  const [selectedLeaseEndDate, setSelectedLeaseEndDate] = useState<Date>();

  const { data: property, isLoading: isLoadingProperty, refetch } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          units(
            *,
            tenant_units(
              *,
              tenant:tenant_id(
                id,
                first_name,
                last_name,
                email
              )
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: tenants, isError: isTenantsError, error: tenantsError } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      console.log("Fetching tenants...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "tenant")
        .order("first_name");

      if (error) {
        console.error("Error fetching tenants:", error);
        throw error;
      }

      console.log("Fetched tenants:", data);
      return data;
    },
  });

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { isSubmitting: isSubmittingAdd },
  } = useForm<AddUnitForm>();

  const {
    register: registerManage,
    handleSubmit: handleSubmitManage,
    reset: resetManage,
    setValue,
    formState: { isSubmitting: isSubmittingManage },
  } = useForm<ManageUnitForm>();

  const {
    handleSubmit: handleSubmitAssign,
    reset: resetAssign,
    setValue: setAssignValue,
    formState: { isSubmitting: isSubmittingAssign },
  } = useForm<AssignTenantForm>();

  const formatTenantLabel = (tenant: any) => {
    console.log("Formatting tenant:", tenant); // Debug log
    const name = [tenant.first_name, tenant.last_name]
      .filter(Boolean)
      .join(' ');
    return name || tenant.email;
  };

  const onSubmitAdd = async (data: AddUnitForm) => {
    try {
      const { error } = await supabase.from("units").insert({
        property_id: id,
        unit_number: data.unit_number,
        monthly_rent: data.monthly_rent,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit added successfully",
      });

      resetAdd();
      setIsAddingUnit(false);
      refetch();
    } catch (error) {
      console.error("Error adding unit:", error);
      toast({
        title: "Error",
        description: "Failed to add unit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmitManage = async (data: ManageUnitForm) => {
    try {
      const { error } = await supabase
        .from("units")
        .update({
          unit_number: data.unit_number,
          monthly_rent: data.monthly_rent,
          status: data.status,
        })
        .eq("id", selectedUnit.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit updated successfully",
      });

      resetManage();
      setIsManagingUnit(false);
      setSelectedUnit(null);
      refetch();
    } catch (error) {
      console.error("Error updating unit:", error);
      toast({
        title: "Error",
        description: "Failed to update unit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssignTenant = async (data: AssignTenantForm) => {
    try {
      if (!selectedLeaseStartDate || !selectedLeaseEndDate) {
        toast({
          title: "Error",
          description: "Please select both lease start and end dates",
          variant: "destructive",
        });
        return;
      }

      const { error: unitError } = await supabase
        .from("units")
        .update({ status: "occupied" })
        .eq("id", selectedUnit.id);

      if (unitError) throw unitError;

      const { error: assignError } = await supabase
        .from("tenant_units")
        .insert({
          tenant_id: data.tenant_id,
          unit_id: selectedUnit.id,
          lease_start_date: format(selectedLeaseStartDate, 'yyyy-MM-dd'),
          lease_end_date: format(selectedLeaseEndDate, 'yyyy-MM-dd'),
          status: 'active'
        });

      if (assignError) throw assignError;

      toast({
        title: "Success",
        description: "Tenant assigned successfully",
      });

      setIsAssigningTenant(false);
      setSelectedUnit(null);
      setSelectedLeaseStartDate(undefined);
      setSelectedLeaseEndDate(undefined);
      refetch();
    } catch (error) {
      console.error("Error assigning tenant:", error);
      toast({
        title: "Error",
        description: "Failed to assign tenant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageUnit = (unit: any) => {
    setSelectedUnit(unit);
    setValue("unit_number", unit.unit_number);
    setValue("monthly_rent", unit.monthly_rent);
    setValue("status", unit.status || "vacant");
    setIsManagingUnit(true);
  };

  const handleAssignTenantDialog = (unit: any) => {
    setSelectedUnit(unit);
    setIsAssigningTenant(true);
  };

  if (isLoadingProperty) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-[#1A1F2C]">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center text-gray-400">Loading property details...</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!property) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-[#1A1F2C]">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center text-gray-400">Property not found</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/properties")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-white">
                    {property.name}
                  </h1>
                  <p className="text-sm text-gray-400">{property.address}</p>
                </div>
              </div>
            </div>

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
                      {property.units?.filter((unit) => unit.status === "occupied")
                        .length || 0}{" "}
                      Occupied Units
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Units</h2>
              <Dialog open={isAddingUnit} onOpenChange={setIsAddingUnit}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Unit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Unit</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitAdd(onSubmitAdd)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit_number">Unit Number</Label>
                      <Input
                        id="unit_number"
                        placeholder="Enter unit number"
                        {...registerAdd("unit_number", { required: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_rent">Monthly Rent</Label>
                      <Input
                        id="monthly_rent"
                        type="number"
                        placeholder="Enter monthly rent"
                        {...registerAdd("monthly_rent", {
                          required: true,
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmittingAdd}
                    >
                      {isSubmittingAdd ? "Adding..." : "Add Unit"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-[#403E43] border-none">
              <Table>
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
                  {property.units?.map((unit) => {
                    const currentTenant = unit.tenant_units?.[0]?.tenant;
                    return (
                      <TableRow key={unit.id}>
                        <TableCell className="text-white">
                          {unit.unit_number}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              unit.status === "occupied"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {unit.status || "vacant"}
                          </span>
                        </TableCell>
                        <TableCell className="text-white">
                          ${unit.monthly_rent}
                        </TableCell>
                        <TableCell className="text-white">
                          {currentTenant
                            ? `${currentTenant.first_name} ${currentTenant.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleManageUnit(unit)}
                            >
                              Manage
                            </Button>
                            {!currentTenant && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssignTenantDialog(unit)}
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
            </Card>

            <Dialog open={isManagingUnit} onOpenChange={setIsManagingUnit}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Unit</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitManage(onSubmitManage)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="manage_unit_number">Unit Number</Label>
                    <Input
                      id="manage_unit_number"
                      placeholder="Enter unit number"
                      {...registerManage("unit_number", { required: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manage_monthly_rent">Monthly Rent</Label>
                    <Input
                      id="manage_monthly_rent"
                      type="number"
                      placeholder="Enter monthly rent"
                      {...registerManage("monthly_rent", {
                        required: true,
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manage_status">Status</Label>
                    <Select 
                      onValueChange={(value) => setValue("status", value)}
                      defaultValue={selectedUnit?.status || "vacant"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmittingManage}
                  >
                    {isSubmittingManage ? "Updating..." : "Update Unit"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAssigningTenant} onOpenChange={setIsAssigningTenant}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Assign Tenant to Unit {selectedUnit?.unit_number}</DialogTitle>
                  <DialogDescription>
                    Select a tenant and set the lease period to assign them to this unit.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const tenant_id = formData.get('tenant_id') as string;
                  handleAssignTenant({ tenant_id, lease_start_date: selectedLeaseStartDate!, lease_end_date: selectedLeaseEndDate! });
                }} 
                className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tenant_id">Select Tenant</Label>
                    {isTenantsError ? (
                      <div className="text-red-500">Error loading tenants: {tenantsError.message}</div>
                    ) : (
                      <Select name="tenant_id" required>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants?.map((tenant) => {
                            console.log("Rendering tenant:", tenant); // Debug log
                            return (
                              <SelectItem 
                                key={tenant.id} 
                                value={tenant.id}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{formatTenantLabel(tenant)}</span>
                                  <span className="text-xs text-gray-500">{tenant.email}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Lease Start Date</Label>
                    <div className="border rounded-md p-2">
                      <CalendarComponent
                        mode="single"
                        selected={selectedLeaseStartDate}
                        onSelect={setSelectedLeaseStartDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Lease End Date</Label>
                    <div className="border rounded-md p-2">
                      <CalendarComponent
                        mode="single"
                        selected={selectedLeaseEndDate}
                        onSelect={setSelectedLeaseEndDate}
                        disabled={(date) => !selectedLeaseStartDate || date <= selectedLeaseStartDate}
                        initialFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAssigningTenant(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!selectedLeaseStartDate || !selectedLeaseEndDate}
                    >
                      Assign Tenant
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PropertyDetails;
