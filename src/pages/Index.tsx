import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Home, Key, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6" />
          <span className="text-xl font-bold">TenantMate</span>
        </div>
        <Button variant="outline" onClick={() => navigate("/auth")}>
          <Key className="mr-2 h-4 w-4" /> Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Simplify Your Property Management
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Streamline communication, maintenance requests, and payments all in one place.
            The perfect solution for property managers and tenants.
          </p>
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")}>
            Get Started <ArrowRight className="ml-2" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-3">Easy Communication</h3>
            <p className="text-muted-foreground">
              Direct messaging between tenants and property managers.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-3">Maintenance Tracking</h3>
            <p className="text-muted-foreground">
              Submit and track maintenance requests in real-time.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-3">Payment Management</h3>
            <p className="text-muted-foreground">
              Secure rent payments and financial tracking.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;