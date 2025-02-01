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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { ArrowLeft, Building2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddUnitForm {
  unit_number: string;
  monthly_rent: number;
}

interface ManageUnitForm {
  unit_number: string;
  monthly_rent: number;
  status: string;
}

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isManagingUnit, setIsManagingUnit] = useState(false);

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

  const handleManageUnit = (unit: any) => {
    setSelectedUnit(unit);
    setValue("unit_number", unit.unit_number);
    setValue("monthly_rent", unit.monthly_rent);
    setValue("status", unit.status || "vacant");
    setIsManagingUnit(true);
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleManageUnit(unit)}
                          >
                            Manage
                          </Button>
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PropertyDetails;