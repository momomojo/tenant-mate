import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Home, Percent, DollarSign, Users, Wrench, FileText, BarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      return profile?.role;
    },
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

  const getStatsByRole = () => {
    switch (userRole) {
      case "property_manager":
        return [
          {
            title: "Total Properties",
            value: "8",
            icon: Building2,
            description: "Properties under management",
            trend: "+1",
            trendUp: true,
          },
          {
            title: "Total Units",
            value: "32",
            icon: Home,
            description: "Units across all properties",
            trend: "+3",
            trendUp: true,
          },
          {
            title: "Active Tenants",
            value: "28",
            icon: Users,
            description: "Current tenants",
            trend: "+2",
            trendUp: true,
          },
          {
            title: "Maintenance",
            value: "5",
            icon: Wrench,
            description: "Open requests",
            trend: "-2",
            trendUp: false,
          },
        ];
      case "admin":
        return [
          {
            title: "Total Revenue",
            value: "$125,000",
            icon: DollarSign,
            description: "Monthly revenue",
            trend: "+8.1%",
            trendUp: true,
          },
          {
            title: "Occupancy Rate",
            value: "94%",
            icon: Percent,
            description: "Current occupancy",
            trend: "+2.5%",
            trendUp: true,
          },
          {
            title: "Properties",
            value: "15",
            icon: Building2,
            description: "Total properties",
            trend: "+1",
            trendUp: true,
          },
          {
            title: "Analytics",
            value: "View",
            icon: BarChart,
            description: "Performance metrics",
            trend: "Updated",
            trendUp: true,
          },
        ];
      case "tenant":
        return [
          {
            title: "My Unit",
            value: "A-101",
            icon: Home,
            description: "Current unit number",
            trend: "Active",
            trendUp: true,
          },
          {
            title: "Rent Due",
            value: "$1,200",
            icon: DollarSign,
            description: "Due on 1st of month",
            trend: "5 days left",
            trendUp: true,
          },
          {
            title: "Maintenance",
            value: "2",
            icon: Wrench,
            description: "Active requests",
            trend: "1 in progress",
            trendUp: true,
          },
          {
            title: "Documents",
            value: "4",
            icon: FileText,
            description: "Important documents",
            trend: "All up to date",
            trendUp: true,
          },
        ];
      default:
        return [];
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white">
                {userRole === "tenant"
                  ? "My Dashboard"
                  : userRole === "property_manager"
                  ? "Property Manager Dashboard"
                  : "Admin Dashboard"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                {userRole === "tenant"
                  ? "Overview of your rental information"
                  : userRole === "property_manager"
                  ? "Overview of your property portfolio"
                  : "System-wide performance overview"}
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {getStatsByRole().map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;