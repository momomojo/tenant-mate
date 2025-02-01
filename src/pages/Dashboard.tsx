import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Home, Percent, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/dashboard/StatCard";

const Dashboard = () => {
  const navigate = useNavigate();

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

  const stats = [
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
              <p className="text-sm text-gray-400">
                Overview of your property management system
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
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