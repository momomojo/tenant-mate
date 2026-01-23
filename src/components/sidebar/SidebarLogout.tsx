import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarFooter } from "@/components/ui/sidebar";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";

export const SidebarLogout = () => {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const userEmail = user?.email || "";
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <SidebarFooter className="p-3">
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo/20 to-brand-purple/20 border border-white/[0.08]">
            <span className="text-xs font-semibold text-brand-indigo-light">
              {userInitial || <User className="h-3.5 w-3.5" />}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {userEmail || "User"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/[0.08] transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </SidebarFooter>
  );
};
