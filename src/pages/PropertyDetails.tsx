import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { AddUnitDialog } from "@/components/property/AddUnitDialog";
import { ManageUnitDialog } from "@/components/property/ManageUnitDialog";
import { AssignTenantDialog } from "@/components/property/AssignTenantDialog";
import { PropertyOverview } from "@/components/property/PropertyOverview";
import { UnitsTable } from "@/components/property/UnitsTable";
import type { UnitWithTenant, TenantProfile } from "@/types";
import { formatTenantLabel } from "@/types";

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedUnit, setSelectedUnit] = useState<UnitWithTenant | null>(null);
  const [isManagingUnit, setIsManagingUnit] = useState(false);
  const [isAssigningTenant, setIsAssigningTenant] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

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
              profiles:tenant_id(
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

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("role", "tenant")
        .order("first_name");

      if (error) throw error;
      return data as TenantProfile[];
    },
  });

  const handleManageUnit = (unit: UnitWithTenant) => {
    setSelectedUnit(unit);
    setIsManagingUnit(true);
  };

  const handleAssignTenant = (unit: UnitWithTenant) => {
    setSelectedUnit(unit);
    setIsAssigningTenant(true);
  };

  if (isLoadingProperty) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-[#1A1F2C]">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center text-gray-400">
              Loading property details...
            </div>
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
        <main className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/properties")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-white">
                    {property.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400">{property.address}</p>
                </div>
              </div>
            </div>

            <PropertyOverview property={property} />

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Units</h2>
                <AddUnitDialog propertyId={id!} onUnitAdded={refetch} />
              </div>

              <Card className="bg-[#403E43] border-none overflow-x-auto">
                <UnitsTable
                  units={property.units || []}
                  onManageUnit={handleManageUnit}
                  onAssignTenant={handleAssignTenant}
                  formatTenantLabel={formatTenantLabel}
                />
              </Card>
            </div>

            {selectedUnit && (
              <>
                <ManageUnitDialog
                  unit={selectedUnit}
                  isOpen={isManagingUnit}
                  onClose={() => {
                    setIsManagingUnit(false);
                    setSelectedUnit(null);
                  }}
                  onUnitUpdated={refetch}
                />
                <AssignTenantDialog
                  unit={selectedUnit}
                  tenants={tenants || []}
                  isOpen={isAssigningTenant}
                  onClose={() => {
                    setIsAssigningTenant(false);
                    setSelectedUnit(null);
                  }}
                  onTenantAssigned={refetch}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PropertyDetails;