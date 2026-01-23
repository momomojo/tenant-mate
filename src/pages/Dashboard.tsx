import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Home, Percent, DollarSign, Users, Wrench, FileText, BarChart, UserPlus, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { PaymentAlerts } from "@/components/dashboard/PaymentAlerts";
import { TopBar } from "@/components/layout/TopBar";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  // Subscribe to real-time updates for dashboard data
  useRealtimeSubscription({
    tables: ["notifications", "maintenance_requests", "tenant_units", "rent_payments"],
    userId: user?.id,
  });

  const { data: userRole, isError: isRoleError, error: roleError, isLoading } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        throw error;
      }

      console.log("Fetched user role:", profile?.role);
      return profile?.role;
    },
    enabled: !!user,
  });

  // Property Manager Stats
  const { data: pmStats } = useQuery({
    queryKey: ["pmDashboardStats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      // Get properties owned/managed by this user
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select(`
          id,
          units (
            id,
            status,
            tenant_units (
              id,
              status
            )
          )
        `)
        .or(`created_by.eq.${user.id},property_manager_id.eq.${user.id}`);

      if (propError) throw propError;

      // Calculate stats
      const totalProperties = properties?.length || 0;
      const totalUnits = properties?.reduce((sum, p) => sum + (p.units?.length || 0), 0) || 0;
      const occupiedUnits = properties?.reduce((sum, p) => {
        return sum + (p.units?.filter((u: any) => u.status === 'occupied').length || 0);
      }, 0) || 0;
      const activeTenants = properties?.reduce((sum, p) => {
        return sum + (p.units?.reduce((uSum: number, u: any) => {
          return uSum + (u.tenant_units?.filter((tu: any) => tu.status === 'active').length || 0);
        }, 0) || 0);
      }, 0) || 0;

      // Get open maintenance requests
      const { count: maintenanceCount } = await supabase
        .from("maintenance_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]);

      return {
        totalProperties,
        totalUnits,
        activeTenants,
        openMaintenance: maintenanceCount || 0,
        occupiedUnits,
      };
    },
    enabled: userRole === 'property_manager' || userRole === 'admin',
  });

  // Applicant Stats for Property Managers
  const { data: applicantStats } = useQuery({
    queryKey: ["applicantStats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("applicants")
        .select(`
          status,
          property:properties!inner(created_by, property_manager_id)
        `)
        .or(`property.created_by.eq.${user.id},property.property_manager_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching applicant stats:", error);
        return { total: 0, pending: 0 };
      }

      const pending = data?.filter((a: any) =>
        ["invited", "started", "submitted", "screening"].includes(a.status)
      ).length || 0;

      return {
        total: data?.length || 0,
        pending,
      };
    },
    enabled: userRole === 'property_manager' || userRole === 'admin',
  });

  // Lease Stats for Property Managers
  const { data: leaseStats } = useQuery({
    queryKey: ["leaseStats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("leases")
        .select(`
          status,
          property:properties!inner(created_by, property_manager_id)
        `)
        .or(`property.created_by.eq.${user.id},property.property_manager_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching lease stats:", error);
        return { total: 0, active: 0, expiringSoon: 0 };
      }

      const active = data?.filter((l: any) => l.status === "active").length || 0;
      const pending = data?.filter((l: any) => ["draft", "pending"].includes(l.status)).length || 0;

      return {
        total: data?.length || 0,
        active,
        pending,
      };
    },
    enabled: userRole === 'property_manager' || userRole === 'admin',
  });

  // Tenant's units and their total rent
  const { data: tenantUnitsData, isError: isUnitsError } = useQuery({
    queryKey: ["tenantUnits", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from('tenant_units')
        .select(`
          unit_id,
          status,
          units (
            unit_number,
            monthly_rent
          )
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error("Error fetching tenant units:", error);
        throw error;
      }

      return data;
    },
    enabled: userRole === 'tenant'
  });

  // Tenant maintenance requests count
  const { data: tenantMaintenanceCount } = useQuery({
    queryKey: ["tenantMaintenanceCount", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      const { count, error } = await supabase
        .from('maintenance_requests')
        .select("*", { count: "exact", head: true })
        .eq('tenant_id', user.id)
        .in("status", ["pending", "in_progress"]);

      if (error) throw error;
      return count || 0;
    },
    enabled: userRole === 'tenant'
  });

  // Tenant documents count - using the document_access_view
  const { data: tenantDocumentsCount } = useQuery({
    queryKey: ["tenantDocumentsCount", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      // Tenants see property documents for their units
      const { count, error } = await supabase
        .from('document_access_view')
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("Error fetching documents count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: userRole === 'tenant'
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1F2C]">
        <p className="text-white">Loading dashboard...</p>
      </div>
    );
  }

  if (isRoleError) {
    console.error("Error loading dashboard:", roleError);
    toast.error("Error loading dashboard. Please try again.");
    return null;
  }

  if (isUnitsError) {
    toast.error("Error loading tenant information. Please try again.");
  }

  const calculateTotalRent = () => {
    if (!tenantUnitsData) return 0;
    return tenantUnitsData.reduce((total, unit) => {
      return total + (unit.units?.monthly_rent || 0);
    }, 0);
  };

  const getUnitNumbers = () => {
    if (!tenantUnitsData) return "";
    return tenantUnitsData
      .map(unit => unit.units?.unit_number)
      .filter(Boolean)
      .join(", ");
  };

  const getStatsByRole = () => {
    console.log("Getting stats for role:", userRole);

    // Calculate occupancy rate
    const occupancyRate = pmStats?.totalUnits
      ? Math.round((pmStats.occupiedUnits / pmStats.totalUnits) * 100)
      : 0;

    switch (userRole) {
      case "property_manager":
        return [
          {
            title: "Total Properties",
            value: String(pmStats?.totalProperties || 0),
            icon: Building2,
            description: "Properties under management",
            trend: "Active",
            trendUp: true,
          },
          {
            title: "Total Units",
            value: String(pmStats?.totalUnits || 0),
            icon: Home,
            description: `${pmStats?.occupiedUnits || 0} occupied`,
            trend: `${occupancyRate}% occupancy`,
            trendUp: occupancyRate >= 80,
          },
          {
            title: "Applicants",
            value: String(applicantStats?.total || 0),
            icon: UserPlus,
            description: `${applicantStats?.pending || 0} pending review`,
            trend: applicantStats?.pending ? "Needs attention" : "All reviewed",
            trendUp: !applicantStats?.pending,
          },
          {
            title: "Leases",
            value: String(leaseStats?.active || 0),
            icon: ScrollText,
            description: `${leaseStats?.pending || 0} pending signature`,
            trend: leaseStats?.pending ? "Action needed" : "All signed",
            trendUp: !leaseStats?.pending,
          },
          {
            title: "Active Tenants",
            value: String(pmStats?.activeTenants || 0),
            icon: Users,
            description: "Current tenants",
            trend: "Active",
            trendUp: true,
          },
          {
            title: "Maintenance",
            value: String(pmStats?.openMaintenance || 0),
            icon: Wrench,
            description: "Open requests",
            trend: pmStats?.openMaintenance === 0 ? "All clear" : "Pending",
            trendUp: pmStats?.openMaintenance === 0,
          },
        ];
      case "admin":
        return [
          {
            title: "Total Properties",
            value: String(pmStats?.totalProperties || 0),
            icon: Building2,
            description: "Properties in system",
            trend: "Active",
            trendUp: true,
          },
          {
            title: "Occupancy Rate",
            value: `${occupancyRate}%`,
            icon: Percent,
            description: `${pmStats?.occupiedUnits || 0}/${pmStats?.totalUnits || 0} units`,
            trend: occupancyRate >= 80 ? "Healthy" : "Below target",
            trendUp: occupancyRate >= 80,
          },
          {
            title: "Applicants",
            value: String(applicantStats?.total || 0),
            icon: UserPlus,
            description: `${applicantStats?.pending || 0} pending review`,
            trend: applicantStats?.pending ? "Needs attention" : "All reviewed",
            trendUp: !applicantStats?.pending,
          },
          {
            title: "Leases",
            value: String(leaseStats?.active || 0),
            icon: ScrollText,
            description: `${leaseStats?.pending || 0} pending signature`,
            trend: leaseStats?.pending ? "Action needed" : "All signed",
            trendUp: !leaseStats?.pending,
          },
          {
            title: "Active Tenants",
            value: String(pmStats?.activeTenants || 0),
            icon: Users,
            description: "Total tenants",
            trend: "Active",
            trendUp: true,
          },
          {
            title: "Maintenance",
            value: String(pmStats?.openMaintenance || 0),
            icon: Wrench,
            description: "Open requests",
            trend: pmStats?.openMaintenance === 0 ? "All clear" : "Pending",
            trendUp: pmStats?.openMaintenance === 0,
          },
        ];
      case "tenant":
        return [
          {
            title: "My Units",
            value: getUnitNumbers() || "None",
            icon: Home,
            description: tenantUnitsData?.length ? "Current unit numbers" : "No units assigned",
            trend: tenantUnitsData?.length ? "Active" : "Contact manager",
            trendUp: !!tenantUnitsData?.length,
          },
          {
            title: "Rent Due",
            value: `$${calculateTotalRent().toLocaleString()}`,
            icon: DollarSign,
            description: "Due on 1st of month",
            trend: "Monthly",
            trendUp: true,
          },
          {
            title: "Maintenance",
            value: String(tenantMaintenanceCount || 0),
            icon: Wrench,
            description: "Active requests",
            trend: tenantMaintenanceCount === 0 ? "All clear" : "In progress",
            trendUp: tenantMaintenanceCount === 0,
          },
          {
            title: "Documents",
            value: String(tenantDocumentsCount || 0),
            icon: FileText,
            description: "Your documents",
            trend: "Available",
            trendUp: true,
          },
        ];
      default:
        console.log("No matching role found:", userRole);
        return [];
    }
  };

  const getDashboardTitle = () => {
    if (userRole === "tenant") return "My Dashboard";
    if (userRole === "property_manager") return "Property Manager Dashboard";
    return "Admin Dashboard";
  };

  const getDashboardSubtitle = () => {
    if (userRole === "tenant") return "Overview of your rental information";
    if (userRole === "property_manager") return "Overview of your property portfolio";
    return "System-wide performance overview";
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          <div className="flex flex-col gap-6 sm:gap-8">
            <TopBar title={getDashboardTitle()} subtitle={getDashboardSubtitle()} />

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {getStatsByRole().map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>

            {userRole === "tenant" && <PaymentAlerts />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;