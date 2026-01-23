import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TenantInfo } from "@/components/tenant/TenantInfo";
import { LeaseHistory } from "@/components/tenant/LeaseHistory";
import { PaymentHistory } from "@/components/tenant/PaymentHistory";
import { MaintenanceHistory } from "@/components/tenant/MaintenanceHistory";

const TenantProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      if (!id) throw new Error("No tenant ID provided");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;

      const { data: leases, error: leasesError } = await supabase
        .from("tenant_units")
        .select(`
          *,
          unit:units (
            unit_number,
            property:properties (
              name
            )
          )
        `)
        .eq("tenant_id", id)
        .order("lease_start_date", { ascending: false });

      if (leasesError) throw leasesError;

      const { data: payments, error: paymentsError } = await supabase
        .from("rent_payments")
        .select(`
          *,
          unit:units (
            unit_number,
            property_id
          )
        `)
        .eq("tenant_id", id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      const { data: maintenance, error: maintenanceError } = await supabase
        .from("maintenance_requests")
        .select(`
          *,
          unit:units (
            unit_number
          )
        `)
        .eq("tenant_id", id)
        .order("created_at", { ascending: false });

      if (maintenanceError) throw maintenanceError;

      return {
        profile,
        leases,
        payments,
        maintenance,
      };
    },
    enabled: !!id,
  });

  if (isLoadingTenant) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center text-gray-400">Loading tenant data...</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!tenant) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center text-gray-400">Tenant not found</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
            <TenantInfo tenant={tenant.profile} />
            <LeaseHistory leases={tenant.leases} tenantId={id!} />
            <PaymentHistory payments={tenant.payments} />
            <MaintenanceHistory requests={tenant.maintenance} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default TenantProfile;