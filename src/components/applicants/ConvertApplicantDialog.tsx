import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useUnits } from "@/hooks/useUnits";
import { useQueryClient } from "@tanstack/react-query";
import type { Applicant } from "@/hooks/useApplicants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, ScrollText } from "lucide-react";

const formSchema = z.object({
  unitId: z.string().min(1, "Unit is required"),
  createLease: z.boolean().default(true),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  monthlyRent: z.coerce.number().optional(),
  securityDeposit: z.coerce.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ConvertApplicantDialogProps {
  applicant: Applicant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConvertApplicantDialog({
  applicant,
  open,
  onOpenChange,
  onSuccess,
}: ConvertApplicantDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConverting, setIsConverting] = useState(false);

  const { data: units } = useUnits(applicant.property_id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitId: applicant.unit_id || "",
      createLease: true,
      leaseStart: format(new Date(), "yyyy-MM-dd"),
      leaseEnd: format(addYears(new Date(), 1), "yyyy-MM-dd"),
      monthlyRent: 0,
      securityDeposit: 0,
    },
  });

  const createLease = form.watch("createLease");
  const selectedUnitId = form.watch("unitId");

  // Auto-fill rent when unit is selected
  const selectedUnit = units?.find((u) => u.id === selectedUnitId);
  if (selectedUnit?.rent_amount && form.getValues("monthlyRent") === 0) {
    form.setValue("monthlyRent", selectedUnit.rent_amount);
  }

  const handleSubmit = async (data: FormData) => {
    setIsConverting(true);

    try {
      // Step 1: Check if applicant has an existing user account
      let tenantId: string;

      // First check if a profile exists with this email
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", applicant.email)
        .maybeSingle();

      if (existingProfile) {
        // User exists, update role to tenant if needed
        tenantId = existingProfile.id;
        if (existingProfile.role !== "tenant") {
          await supabase
            .from("profiles")
            .update({ role: "tenant" })
            .eq("id", tenantId);
        }
      } else {
        // No account exists - applicant must sign up first
        throw new Error(
          `No account found for ${applicant.email}. The applicant must create an account (sign up) before they can be converted to a tenant.`
        );
      }

      // Step 2: Update unit status
      await supabase
        .from("units")
        .update({ status: "occupied" })
        .eq("id", data.unitId);

      // Step 3: Create tenant_unit assignment
      const { error: assignError } = await supabase.from("tenant_units").insert({
        tenant_id: tenantId,
        unit_id: data.unitId,
        status: "active",
        move_in_date: data.leaseStart || new Date().toISOString(),
      });

      if (assignError) {
        console.error("Error assigning tenant to unit:", assignError);
        // Continue anyway - might already be assigned
      }

      // Step 4: Create lease if requested
      if (data.createLease && data.leaseStart && data.leaseEnd) {
        const { data: { user } } = await supabase.auth.getUser();

        const { error: leaseError } = await supabase.from("leases").insert({
          property_id: applicant.property_id,
          unit_id: data.unitId,
          tenant_id: tenantId,
          lease_start: data.leaseStart,
          lease_end: data.leaseEnd,
          monthly_rent: data.monthlyRent || selectedUnit?.rent_amount || 0,
          security_deposit: data.securityDeposit || 0,
          status: "draft",
          created_by: user?.id,
        });

        if (leaseError) {
          console.error("Error creating lease:", leaseError);
          // Continue - lease creation is optional
        }
      }

      // Step 5: Update applicant status to converted
      await supabase
        .from("applicants")
        .update({
          status: "converted",
          converted_tenant_id: tenantId,
          converted_at: new Date().toISOString(),
        })
        .eq("id", applicant.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["leases"] });

      toast({
        title: "Applicant converted",
        description: `${applicant.first_name || applicant.email} is now a tenant.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error converting applicant:", error);
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Could not convert applicant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const applicantName = `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() || applicant.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Convert to Tenant
          </DialogTitle>
          <DialogDescription>
            Convert <strong>{applicantName}</strong> from an applicant to an active tenant.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Unit Selection */}
            <FormField
              control={form.control}
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Unit *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Unit {unit.unit_number}
                          {unit.status === "occupied" && " (Occupied)"}
                          {unit.rent_amount && ` - $${unit.rent_amount}/mo`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Create Lease Checkbox */}
            <FormField
              control={form.control}
              name="createLease"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4" />
                      Create lease agreement
                    </FormLabel>
                    <FormDescription>
                      Automatically create a draft lease for this tenant
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Lease Details (if creating lease) */}
            {createLease && (
              <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="leaseStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease Start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leaseEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease End</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={selectedUnit?.rent_amount?.toString() || "0"}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="securityDeposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isConverting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isConverting}>
                {isConverting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Convert to Tenant
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
