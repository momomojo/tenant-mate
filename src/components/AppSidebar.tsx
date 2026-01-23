import { Sidebar } from "@/components/ui/sidebar";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarLogout } from "./sidebar/SidebarLogout";

export function AppSidebar() {
  return (
    <Sidebar
      variant="sidebar"
      className="border-r border-white/[0.06] bg-sidebar"
    >
      <SidebarHeader />
      <SidebarNavigation />
      <SidebarLogout />
    </Sidebar>
  );
}
