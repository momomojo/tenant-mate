import { useNavigate, useLocation } from "react-router-dom";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useMenuItems } from "../navigation/SidebarItems";

export const SidebarNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useMenuItems();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <SidebarContent className="px-3">
      <SidebarMenu className="space-y-1">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full rounded-xl px-3 py-2.5 transition-all duration-200 group relative
                  ${active
                    ? "bg-brand-indigo/10 text-white"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                  }
                `}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-brand-indigo" />
                )}
                <item.icon className={`h-[18px] w-[18px] transition-colors duration-200 ${active ? "text-brand-indigo" : "text-muted-foreground group-hover:text-white"}`} />
                <span className="text-sm font-medium">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarContent>
  );
};
