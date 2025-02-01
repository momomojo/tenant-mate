import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, Percent, DollarSign } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
      description: "Total properties managed"
    },
    {
      title: "Units",
      value: "48",
      icon: Home,
      description: "Total units across properties"
    },
    {
      title: "Occupancy",
      value: "92%",
      icon: Percent,
      description: "Current occupancy rate"
    },
    {
      title: "Revenue",
      value: "$45,231",
      icon: DollarSign,
      description: "Total monthly revenue"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to your property management dashboard</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;