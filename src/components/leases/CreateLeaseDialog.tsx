import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, addYears } from "date-fns";
import { useProperties } from "@/hooks/useProperties";
import { useUnits } from "@/hooks/useUnits";
import { useCreateLease, useLeaseTemplates } from "@/hooks/useLeases";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

const formSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  templateId: z.string().optional(),
  leaseStart: z.string().min(1, "Start date is required"),
  leaseEnd: z.string().min(1, "End date is required"),
  monthlyRent: z.coerce.number().min(1, "Monthly rent is required"),
  securityDeposit: z.coerce.number().min(0).optional(),
  lateFee: z.coerce.number().min(0).optional(),
  gracePeriodDays: z.coerce.number().min(0).optional(),
  petDeposit: z.coerce.number().min(0).optional(),
  petRent: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Tenant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function CreateLeaseDialog() {
  const [open, setOpen] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const { toast } = useToast();

  const { data: properties } = useProperties();
  const { data: templates } = useLeaseTemplates();
  const { mutateAsync: createLease, isPending } = useCreateLease();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: "",
      unitId: "",
      tenantId: "",
      templateId: "__none__",
      leaseStart: format(new Date(), "yyyy-MM-dd"),
      leaseEnd: format(addYears(new Date(), 1), "yyyy-MM-dd"),
      monthlyRent: 0,
      securityDeposit: 0,
      lateFee: 50,
      gracePeriodDays: 5,
      petDeposit: 0,
      petRent: 0,
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const selectedUnitId = form.watch("unitId");

  // Get units for selected property
  const { data: units } = useUnits(selectedPropertyId || undefined);

  // Load tenants assigned to selected unit
  useEffect(() => {
    async function loadTenants() {
      if (!selectedUnitId) {
        setAvailableTenants([]);
        return;
      }

      setLoadingTenants(true);
      try {
        const { data, error } = await supabase
          .from("tenant_units")
          .select(`
            tenant:profiles!tenant_units_tenant_id_fkey(id, first_name, last_name, email)
          `)
          .eq("unit_id", selectedUnitId)
          .eq("status", "active");

        if (error) throw error;

        const tenants = data
          ?.map((tu: any) => tu.tenant)
          .filter(Boolean) as Tenant[];
        setAvailableTenants(tenants || []);
      } catch (error) {
        console.error("Error loading tenants:", error);
      } finally {
        setLoadingTenants(false);
      }
    }

    loadTenants();
  }, [selectedUnitId]);

  // Auto-fill rent when unit is selected
  useEffect(() => {
    if (selectedUnitId && units) {
      const unit = units.find((u) => u.id === selectedUnitId);
      if (unit?.rent_amount) {
        form.setValue("monthlyRent", unit.rent_amount);
      }
    }
  }, [selectedUnitId, units, form]);

  const handleSubmit = async (data: FormData) => {
    try {
      await createLease({
        propertyId: data.propertyId,
        unitId: data.unitId,
        tenantId: data.tenantId,
        templateId: data.templateId === "__none__" ? undefined : data.templateId,
        leaseStart: data.leaseStart,
        leaseEnd: data.leaseEnd,
        monthlyRent: data.monthlyRent,
        securityDeposit: data.securityDeposit,
        lateFee: data.lateFee,
        gracePeriodDays: data.gracePeriodDays,
        petDeposit: data.petDeposit,
        petRent: data.petRent,
      });

      toast({
        title: "Lease created",
        description: "The lease draft has been created successfully.",
      });

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating lease:", error);
      toast({
        title: "Error",
        description: "Failed to create lease. Please try again.",
        variant: "destructive",
      });
    }
  };

  const setLeaseDuration = (months: number) => {
    const startDate = new Date(form.getValues("leaseStart"));
    const endDate = addMonths(startDate, months);
    form.setValue("leaseEnd", format(endDate, "yyyy-MM-dd"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Lease
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lease</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Property and Unit Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("unitId", "");
                        form.setValue("tenantId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("tenantId", "");
                      }}
                      disabled={!selectedPropertyId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units?.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            Unit {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tenant Selection */}
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedUnitId || loadingTenants}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingTenants
                              ? "Loading..."
                              : availableTenants.length === 0
                              ? "No tenants in this unit"
                              : "Select tenant"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {`${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() ||
                            tenant.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only tenants currently assigned to this unit are shown.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Selection */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lease Template</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No template</SelectItem>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          {template.is_default && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lease Period */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Lease Period *</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLeaseDuration(6)}
                  >
                    6 Months
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLeaseDuration(12)}
                  >
                    1 Year
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLeaseDuration(24)}
                  >
                    2 Years
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="leaseStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
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
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial Terms */}
            <div className="space-y-4">
              <FormLabel>Financial Terms</FormLabel>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1500" {...field} />
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
                        <Input type="number" placeholder="1500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lateFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Late Fee</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gracePeriodDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Period (days)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="petDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet Deposit</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="petRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet Rent (monthly)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Lease
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
