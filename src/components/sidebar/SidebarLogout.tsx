import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarFooter } from "@/components/ui/sidebar";

export const SidebarLogout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
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
  );
};