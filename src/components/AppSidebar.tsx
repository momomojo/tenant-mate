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
import { menuItems } from "./navigation/SidebarItems";

export function AppSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar variant="sidebar">
      <div className="p-4">
        <h1 className="text-xl font-bold text-sidebar-foreground">PropertyPro</h1>
      </div>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                onClick={() => navigate(item.path)}
                className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-sidebar-primary py-3 text-center text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors duration-200"
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