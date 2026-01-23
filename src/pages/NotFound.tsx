import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className="relative z-10 text-center px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] mx-auto mb-6">
          <Building2 className="h-7 w-7 text-brand-indigo-light" />
        </div>

        <h1 className="text-6xl font-bold text-white mb-2 tracking-tight">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          This page doesn't exist or has been moved.
        </p>

        <Button
          onClick={() => navigate("/")}
          className="bg-brand-indigo hover:bg-brand-indigo-light text-white rounded-xl px-6 shadow-glow hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] transition-all duration-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
