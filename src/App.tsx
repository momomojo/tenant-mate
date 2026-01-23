
import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { Routes, Route } from "react-router-dom";
import { OfflineIndicator } from "@/components/OfflineIndicator";

// Eager-loaded pages (entry points)
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Lazy-loaded pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Properties = lazy(() => import("@/pages/Properties"));
const PropertyDetails = lazy(() => import("@/pages/PropertyDetails"));
const Tenants = lazy(() => import("@/pages/Tenants"));
const TenantProfile = lazy(() => import("@/pages/TenantProfile"));
const Documents = lazy(() => import("@/pages/Documents"));
const Payments = lazy(() => import("@/pages/Payments"));
const StripeOnboarding = lazy(() => import("@/pages/StripeOnboarding"));
const Maintenance = lazy(() => import("@/pages/Maintenance"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));
const Messages = lazy(() => import("@/pages/Messages"));
const Applicants = lazy(() => import("@/pages/Applicants"));
const Leases = lazy(() => import("@/pages/Leases"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Inspections = lazy(() => import("@/pages/Inspections"));

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
      <BrowserRouter basename="/tenant-mate">
        <div className="min-h-screen bg-background">
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background"><div className="h-8 w-8 rounded-full border-2 border-brand-indigo/20 border-t-brand-indigo animate-spin" /></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetails />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/tenants/:id" element={<TenantProfile />} />
              <Route path="/applicants" element={<Applicants />} />
              <Route path="/leases" element={<Leases />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/stripe-onboarding" element={<StripeOnboarding />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/inspections" element={<Inspections />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <OfflineIndicator />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
