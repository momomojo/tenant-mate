import { Building2, Home, Users, Wrench, FileText, BarChart, Settings2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface MenuItem {
  title: string;
  icon: any;
  path: string;
  roles?: string[];
}

const fetchUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
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
};

export const useMenuItems = () => {
  const { data: userRole, isError, error } = useQuery({
    queryKey: ["userRole"],
    queryFn: fetchUserRole,
  });

  console.log("Current user role:", userRole);

  if (isError) {
    console.error("Error in useMenuItems:", error);
  }

  const allMenuItems: MenuItem[] = [
    { 
      title: "Dashboard", 
      icon: Home, 
      path: "/dashboard",
      roles: ["admin", "property_manager", "tenant"] 
    },
    { 
      title: "Properties", 
      icon: Building2, 
      path: "/properties",
      roles: ["admin", "property_manager"] 
    },
    { 
      title: "Tenants", 
      icon: Users, 
      path: "/tenants",
      roles: ["admin", "property_manager"] 
    },
    { 
      title: "Maintenance", 
      icon: Wrench, 
      path: "/maintenance",
      roles: ["admin", "property_manager", "tenant"] 
    },
    { 
      title: "Documents", 
      icon: FileText, 
      path: "/documents",
      roles: ["admin", "property_manager", "tenant"] 
    },
    { 
      title: "Payments", 
      icon: DollarSign, 
      path: "/payments",
      roles: ["admin", "property_manager", "tenant"] 
    },
    { 
      title: "Reports", 
      icon: BarChart, 
      path: "/reports",
      roles: ["admin", "property_manager"] 
    },
    { 
      title: "Settings", 
      icon: Settings2, 
      path: "/settings",
      roles: ["admin", "property_manager", "tenant"] 
    },
  ];

  // Add console log to debug filtered items
  const filteredItems = allMenuItems.filter(item => 
    !item.roles || (userRole && item.roles.includes(userRole))
  );

  console.log("Filtered menu items:", filteredItems);
  return filteredItems;
};