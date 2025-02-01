import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";

interface ManageUnitForm {
  unit_number: string;
  monthly_rent: number;
  status: string;
}

interface ManageUnitDialogProps {
  unit: any;
  isOpen: boolean;
  onClose: () => void;
  onUnitUpdated: () => void;
}

export function ManageUnitDialog({
  unit,
  isOpen,
  onClose,
  onUnitUpdated,
}: ManageUnitDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ManageUnitForm>({
    defaultValues: {
      unit_number: unit?.unit_number,
      monthly_rent: unit?.monthly_rent,
      status: unit?.status || "vacant",
    },
  });

  const formatTenantLabel = (tenant: any): string => {
    if (!tenant) return "-";
    const name = [tenant.first_name, tenant.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || tenant.email || "-";
  };

  const handleEndLease = async (tenantUnitId: string) => {
    try {
      const { error: tenantUnitError } = await supabase
        .from("tenant_units")
        .update({ status: "ended" }) // Changed from 'inactive' to 'ended'
        .eq("id", tenantUnitId);

      if (tenantUnitError) throw tenantUnitError;

      const { error: unitError } = await supabase
        .from("units")
        .update({ status: "vacant" })
        .eq("id", unit.id);

      if (unitError) throw unitError;

      toast({
        title: "Success",
        description: "Lease ended successfully",
      });

      onClose();
      onUnitUpdated();
    } catch (error) {
      console.error("Error ending lease:", error);
      toast({
        title: "Error",
        description: "Failed to end lease. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: ManageUnitForm) => {
    try {
      const { error } = await supabase
        .from("units")
        .update({
          unit_number: data.unit_number,
          monthly_rent: data.monthly_rent,
          status: data.status,
        })
        .eq("id", unit.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit updated successfully",
      });

      onClose();
      onUnitUpdated();
    } catch (error) {
      console.error("Error updating unit:", error);
      toast({
        title: "Error",
        description: "Failed to update unit. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unit_number">Unit Number</Label>
            <Input
              id="unit_number"
              placeholder="Enter unit number"
              {...register("unit_number", { required: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_rent">Monthly Rent</Label>
            <Input
              id="monthly_rent"
              type="number"
              placeholder="Enter monthly rent"
              {...register("monthly_rent", {
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value) => setValue("status", value)}
              defaultValue={unit?.status || "vacant"}
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

          {unit?.tenant_units?.find((tu: any) => tu.status === "active") && (
            <div className="space-y-2 border-t pt-4">
              <Label>Current Tenant</Label>
              <div className="text-sm text-gray-500">
                {formatTenantLabel(
                  unit.tenant_units.find((tu: any) => tu.status === "active")
                    ?.tenant
                )}
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  handleEndLease(
                    unit.tenant_units.find((tu: any) => tu.status === "active").id
                  )
                }
                className="mt-2"
              >
                End Lease
              </Button>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}