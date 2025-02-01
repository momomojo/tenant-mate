import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: "Home", path: "/dashboard" },
  { title: "Properties", icon: "Building2", path: "/properties" },
  { title: "Tenants", icon: "Users", path: "/tenants" },
  { title: "Maintenance", icon: "Wrench", path: "/maintenance" },
  { title: "Documents", icon: "FileText", path: "/documents" },
  { title: "Reports", icon: "BarChart", path: "/reports" },
  { title: "Settings", icon: "Settings", path: "/settings" },
  { title: "Admin Settings", icon: "Settings2", path: "/admin-settings" },
];

export function AppSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r bg-[#0A0D14]">
      <div className="p-4 text-xl font-bold text-white">PropertyPro</div>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                onClick={() => navigate(item.path)}
                className="w-full text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-purple-600 py-3 text-center text-white hover:bg-purple-700"
        >
          <div className="flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </div>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}