import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Home, Percent, DollarSign, Users, Wrench } from "lucide-react";
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
    const adminManagerStats = [
      {
        title: "Properties",
        value: "12",
        icon: Building2,
        description: "Total properties managed",
        trend: "+2.5%",
        trendUp: true,
      },
      {
        title: "Units",
        value: "48",
        icon: Home,
        description: "Total units across properties",
        trend: "+4.1%",
        trendUp: true,
      },
      {
        title: "Occupancy",
        value: "92%",
        icon: Percent,
        description: "Current occupancy rate",
        trend: "-0.8%",
        trendUp: false,
      },
      {
        title: "Revenue",
        value: "$45,231",
        icon: DollarSign,
        description: "Total monthly revenue",
        trend: "+12.3%",
        trendUp: true,
      },
    ];

    const tenantStats = [
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

    return userRole === "tenant" ? tenantStats : adminManagerStats;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {userRole === "tenant" ? "My Dashboard" : "Property Dashboard"}
              </h1>
              <p className="text-sm text-gray-400">
                {userRole === "tenant"
                  ? "Overview of your rental information"
                  : "Overview of your property management system"}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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