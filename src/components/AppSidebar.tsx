import { Sidebar } from "@/components/ui/sidebar";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarLogout } from "./sidebar/SidebarLogout";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const isMobile = useIsMobile();

  return (
    <Sidebar 
      variant="sidebar" 
      className="border-r border-sidebar-border"
    >
      <SidebarHeader />
      <SidebarNavigation />
      <SidebarLogout />
    </Sidebar>
  );
}