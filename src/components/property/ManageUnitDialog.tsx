import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { UnitForm, UnitFormData } from "./UnitForm";
import { CurrentTenant } from "./CurrentTenant";

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
  const { handleSubmit, formState: { isSubmitting }, control } = useForm<UnitFormData>({
    defaultValues: {
      unit_number: unit?.unit_number || "",
      monthly_rent: unit?.monthly_rent || 0,
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
        .update({ status: "ended" })
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

  const onSubmit = async (data: UnitFormData) => {
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

  const activeTenantUnit = unit?.tenant_units?.find(
    (tu: any) => tu.status === "active"
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Unit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <UnitForm
              unit={unit}
              control={control}
              isSubmitting={isSubmitting}
            />
            {activeTenantUnit && (
              <CurrentTenant
                tenant={activeTenantUnit.tenant}
                onEndLease={() => handleEndLease(activeTenantUnit.id)}
                formatTenantLabel={formatTenantLabel}
              />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}