import { useQuery } from "@tanstack/react-query";
import { Building2, Search, Users, Home, Store, Warehouse, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

type PropertyType = "residential" | "commercial" | "mixed_use" | "industrial";

interface AddPropertyForm {
  name: string;
  address: string;
  property_type: PropertyType;
}

const propertyTypeConfig: Record<PropertyType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  residential: { label: "Residential", icon: Home, color: "text-brand-blue", bgColor: "bg-brand-blue/10" },
  commercial: { label: "Commercial", icon: Store, color: "text-status-success", bgColor: "bg-status-success/10" },
  mixed_use: { label: "Mixed Use", icon: Building2, color: "text-brand-purple-light", bgColor: "bg-brand-purple/10" },
  industrial: { label: "Industrial", icon: Warehouse, color: "text-status-warning", bgColor: "bg-status-warning/10" },
};

const Properties = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          units:units(
            id,
            unit_number,
            status,
            tenant_units(
              tenant:tenant_id(
                first_name,
                last_name
              )
            )
          )
        `);

      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<AddPropertyForm>({
    defaultValues: {
      property_type: "residential",
    },
  });

  const onSubmit = async (data: AddPropertyForm) => {
    try {
      const { error } = await supabase.from("properties").insert({
        name: data.name,
        address: data.address,
        property_type: data.property_type,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property added successfully",
      });

      reset();
      setIsAddingProperty(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredProperties = properties?.filter(
    (property) =>
      property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          <div className="flex flex-col gap-6 sm:gap-8">
            <TopBar title="Properties" subtitle="Manage your properties and units" />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 rounded-xl h-10"
                />
              </div>
              <Dialog open={isAddingProperty} onOpenChange={setIsAddingProperty}>
                <DialogTrigger asChild>
                  <Button className="bg-brand-indigo hover:bg-brand-indigo-light text-white rounded-xl h-10 px-5 shadow-glow-sm hover:shadow-glow transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-surface-elevated border-white/[0.08] rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg">Add New Property</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Property Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter property name"
                        {...register("name", { required: true })}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-xs font-medium text-muted-foreground">Address</Label>
                      <Input
                        id="address"
                        placeholder="Enter property address"
                        {...register("address", { required: true })}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Property Type</Label>
                      <Controller
                        name="property_type"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl h-11">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-elevated border-white/[0.08]">
                              {Object.entries(propertyTypeConfig).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <config.icon className="h-4 w-4" />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-brand-indigo hover:bg-brand-indigo-light text-white rounded-xl h-11 mt-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Adding..." : "Add Property"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4 animate-pulse">
                    <div className="h-5 w-32 skeleton" />
                    <div className="h-4 w-48 skeleton" />
                    <div className="h-8 w-full skeleton" />
                  </div>
                ))}
              </div>
            ) : filteredProperties?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-white mb-1">No properties found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? "Try a different search term" : "Add your first property to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setIsAddingProperty(true)}
                    className="bg-brand-indigo hover:bg-brand-indigo-light text-white rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredProperties?.map((property, index) => {
                  const totalUnits = property.units?.length || 0;
                  const occupiedUnits =
                    property.units?.filter((unit) => unit.status === "occupied")
                      .length || 0;
                  const occupancyRate =
                    totalUnits > 0
                      ? Math.round((occupiedUnits / totalUnits) * 100)
                      : 0;

                  const propertyType = (property.property_type as PropertyType) || "residential";
                  const typeConfig = propertyTypeConfig[propertyType];
                  const TypeIcon = typeConfig?.icon || Building2;

                  return (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div
                        className="group relative overflow-hidden rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-pointer card-hover-lift"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-white truncate mb-0.5">
                              {property.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full ${typeConfig?.bgColor || "bg-white/[0.06]"} ${typeConfig?.color || "text-muted-foreground"}`}>
                            <TypeIcon className="h-3 w-3" />
                            <span>{typeConfig?.label || "Property"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-indigo/10">
                              <Building2 className="h-3.5 w-3.5 text-brand-indigo-light" />
                            </div>
                            <span className="text-sm text-gray-300">
                              {totalUnits} Units
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-purple/10">
                              <Users className="h-3.5 w-3.5 text-brand-purple-light" />
                            </div>
                            <span className="text-sm text-gray-300">
                              {occupancyRate}% Occupied
                            </span>
                          </div>
                        </div>

                        {/* Occupancy bar */}
                        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-indigo to-brand-purple rounded-full transition-all duration-500"
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Properties;
