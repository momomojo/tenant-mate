import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { UnitForm, UnitFormData } from "./UnitForm";
import { CurrentTenant } from "./CurrentTenant";
import { DialogActions } from "./DialogActions";
import type { UnitWithTenant, TenantProfile } from "@/types";
import { formatTenantLabel } from "@/types";

interface TenantUnitWithProfile {
  id: string;
  status: string | null;
  profiles?: TenantProfile | null;
}

interface UnitUpdateFormProps {
  unit: UnitWithTenant;
  onClose: () => void;
  onUnitUpdated: () => void;
}

export function UnitUpdateForm({ unit, onClose, onUnitUpdated }: UnitUpdateFormProps) {
  const { toast } = useToast();
  const { handleSubmit, formState: { isSubmitting }, control } = useForm<UnitFormData>({
    defaultValues: {
      unit_number: unit?.unit_number || "",
      monthly_rent: unit?.monthly_rent || 0,
      status: unit?.status || "vacant",
    },
  });

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
    (tu: TenantUnitWithProfile) => tu.status === "active"
  );

  const currentTenant = activeTenantUnit?.profiles || null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <UnitForm
        unit={unit}
        control={control}
        isSubmitting={isSubmitting}
      />
      {activeTenantUnit && currentTenant && (
        <CurrentTenant
          tenant={currentTenant}
          onEndLease={() => handleEndLease(activeTenantUnit.id)}
          formatTenantLabel={formatTenantLabel}
        />
      )}
      <DialogActions onClose={onClose} isSubmitting={isSubmitting} />
    </form>
  );
}