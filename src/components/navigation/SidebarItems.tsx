import {
  Building2,
  Home,
  Users,
  Wrench,
  FileText,
  BarChart,
  Settings2,
  DollarSign,
  MessageSquare,
  UserPlus,
  ScrollText,
  Receipt,
  ClipboardCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { queryKeys } from "@/lib/query-keys";
import { QUERY_STALE_TIME_MS, QUERY_RETRY_COUNT, USER_ROLES } from "@/lib/constants";
import type { MenuItem } from "@/types";

const ALL_MENU_ITEMS: MenuItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/dashboard",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager, USER_ROLES.tenant],
  },
  {
    title: "Properties",
    icon: Building2,
    path: "/properties",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Tenants",
    icon: Users,
    path: "/tenants",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Applicants",
    icon: UserPlus,
    path: "/applicants",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Leases",
    icon: ScrollText,
    path: "/leases",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    path: "/maintenance",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager, USER_ROLES.tenant],
  },
  {
    title: "Messages",
    icon: MessageSquare,
    path: "/messages",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager, USER_ROLES.tenant],
  },
  {
    title: "Documents",
    icon: FileText,
    path: "/documents",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager, USER_ROLES.tenant],
  },
  {
    title: "Payments",
    icon: DollarSign,
    path: "/payments",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager, USER_ROLES.tenant],
  },
  {
    title: "Reports",
    icon: BarChart,
    path: "/reports",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Expenses",
    icon: Receipt,
    path: "/expenses",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Inspections",
    icon: ClipboardCheck,
    path: "/inspections",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager],
  },
  {
    title: "Settings",
    icon: Settings2,
    path: "/settings",
    roles: [USER_ROLES.admin, USER_ROLES.propertyManager, USER_ROLES.tenant],
  },
];

export const useMenuItems = (): MenuItem[] => {
  const { user } = useAuthenticatedUser();

  const { data: userRole } = useQuery({
    queryKey: queryKeys.userRole(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("No user found");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return profile?.role;
    },
    enabled: !!user,
    retry: QUERY_RETRY_COUNT,
    staleTime: QUERY_STALE_TIME_MS,
  });

  return ALL_MENU_ITEMS.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );
};
