
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { Routes, Route } from "react-router-dom";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import PropertyDetails from "@/pages/PropertyDetails";
import Tenants from "@/pages/Tenants";
import TenantProfile from "@/pages/TenantProfile";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Documents from "@/pages/Documents";
import Payments from "@/pages/Payments";
import StripeOnboarding from "@/pages/StripeOnboarding";
import Maintenance from "@/pages/Maintenance";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Messages from "@/pages/Messages";
import Applicants from "@/pages/Applicants";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#1A1F2C]">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/tenants/:id" element={<TenantProfile />} />
            <Route path="/applicants" element={<Applicants />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/stripe-onboarding" element={<StripeOnboarding />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <OfflineIndicator />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
