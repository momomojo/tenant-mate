import { Sidebar } from "@/components/ui/sidebar";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarLogout } from "./sidebar/SidebarLogout";

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar">
      <SidebarHeader />
      <SidebarNavigation />
      <SidebarLogout />
    </Sidebar>
  );
}