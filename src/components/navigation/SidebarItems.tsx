import { Building2, Home, Users, Wrench, FileText, BarChart, Settings, Settings2 } from "lucide-react";

export const menuItems = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Properties", icon: Building2, path: "/properties" },
  { title: "Tenants", icon: Users, path: "/tenants" },
  { title: "Maintenance", icon: Wrench, path: "/maintenance" },
  { title: "Documents", icon: FileText, path: "/documents" },
  { title: "Reports", icon: BarChart, path: "/reports" },
  { title: "Settings", icon: Settings, path: "/settings" },
  { title: "Admin Settings", icon: Settings2, path: "/admin-settings" },
];