import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const SidebarHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="p-5 pb-4">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-3 group"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple shadow-glow-sm group-hover:shadow-glow transition-shadow duration-300">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-white tracking-tight">
            TenantMate
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Property Management
          </span>
        </div>
      </button>
    </div>
  );
};
