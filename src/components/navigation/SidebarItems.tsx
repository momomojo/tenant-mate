import { Building2, Home, Users, Wrench, FileText, BarChart, Settings2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MenuItem } from "@/types";

const fetchUserRole = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user found");
      throw new Error("No user found");
    }

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
  } catch (error) {
    console.error("Error in fetchUserRole:", error);
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !session) {
      toast.error("Session expired. Please login again.");
      window.location.href = "/auth";
      throw error;
    }
    return fetchUserRole();
  }
};

export const useMenuItems = () => {
  const { data: userRole, isError, error } = useQuery({
    queryKey: ["userRole"],
    queryFn: fetchUserRole,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const filteredItems = allMenuItems.filter(item =>
    !item.roles || (userRole && item.roles.includes(userRole))
  );

  console.log("Filtered menu items:", filteredItems);
  return filteredItems;
};