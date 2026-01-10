import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuthenticatedUser();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      )}
    </div>
  );
}
