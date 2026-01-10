import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { TopBar } from "@/components/layout/TopBar";
import { useState, useEffect } from "react";
import { User, Bell, Shield, CreditCard } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address_line1: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (userProfile) {
      setProfile({
        first_name: userProfile.first_name || "",
        last_name: userProfile.last_name || "",
        email: userProfile.email || "",
        phone_number: userProfile.phone_number || "",
        address_line1: userProfile.address_line1 || "",
        city: userProfile.city || "",
        state: userProfile.state || "",
        postal_code: userProfile.postal_code || "",
      });
    }
  }, [userProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          address_line1: data.address_line1,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
        })
        .eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      toast({ title: "Success", description: "Profile updated successfully" });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profile);
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-[#1A1F2C]">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-gray-400">Loading...</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col gap-8 max-w-4xl">
            <TopBar title="Settings" subtitle="Manage your account settings and preferences" />

            {/* Profile Settings */}
            <Card className="bg-[#403E43] border-none">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-white">Profile Information</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">First Name</Label>
                    <Input
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      className="bg-[#2A2D35] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Last Name</Label>
                    <Input
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="bg-[#2A2D35] border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-[#2A2D35] border-gray-600 text-gray-400"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Phone Number</Label>
                  <Input
                    value={profile.phone_number}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                    className="bg-[#2A2D35] border-gray-600 text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <Separator className="bg-gray-600" />
                <div className="space-y-2">
                  <Label className="text-gray-300">Address</Label>
                  <Input
                    value={profile.address_line1}
                    onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
                    className="bg-[#2A2D35] border-gray-600 text-white"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">City</Label>
                    <Input
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="bg-[#2A2D35] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">State</Label>
                    <Input
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="bg-[#2A2D35] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Postal Code</Label>
                    <Input
                      value={profile.postal_code}
                      onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      className="bg-[#2A2D35] border-gray-600 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="mt-4"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="bg-[#403E43] border-none">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-white">Account Information</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-300">Account Type</p>
                    <p className="text-white font-medium capitalize">
                      {userProfile?.role?.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-300">Member Since</p>
                    <p className="text-white font-medium">
                      {userProfile?.created_at
                        ? new Date(userProfile.created_at).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Connect (for property managers) */}
            {userProfile?.role === "property_manager" && (
              <Card className="bg-[#403E43] border-none">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white">Payment Settings</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure your payment receiving settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/stripe-onboarding"}
                  >
                    Manage Stripe Connect
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
