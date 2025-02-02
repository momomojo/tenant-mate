import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StripeConnectSetup } from "@/components/settings/StripeConnectSetup";

const Settings = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Settings</h1>
              <p className="text-sm text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>

            <StripeConnectSetup />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;