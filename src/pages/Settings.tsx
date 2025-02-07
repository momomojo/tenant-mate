import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StripeConnectSetup } from "@/components/settings/StripeConnectSetup";
import { Settings2, CreditCard, Building2, Bell, Shield, DollarSign } from "lucide-react";
import { PaymentSettings } from "@/components/settings/PaymentSettings";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

const Settings = () => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProfileFormData>({
    defaultValues: {
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      email: profile?.email || "",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          // Add more fields as needed for the profile
        })
        .eq("id", profile?.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (isLoading) return null;

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

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="bg-sidebar-accent">
                <TabsTrigger value="general" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-white">
                  <Settings2 className="mr-2 h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-white">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="properties" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-white">
                  <Building2 className="mr-2 h-4 w-4" />
                  Properties
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-white">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-white">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-white">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Billing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and contact details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            {...form.register("firstName")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            {...form.register("lastName")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...form.register("email")}
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-sm text-muted-foreground">
                          Email cannot be changed as it's used for authentication
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...form.register("phone")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="addressLine1">Address</Label>
                        <Input
                          id="addressLine1"
                          {...form.register("addressLine1")}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            {...form.register("city")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            {...form.register("state")}
                            maxLength={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            {...form.register("postalCode")}
                          />
                        </div>
                      </div>

                      <Button type="submit">Save Changes</Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <div className="space-y-6">
                  {profile?.role === 'property_manager' && (
                    <>
                      <StripeConnectSetup />
                      <PaymentSettings />
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="properties">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Settings</CardTitle>
                    <CardDescription>
                      Configure default settings for all properties
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Default Lease Term (Months)</Label>
                        <Input type="number" placeholder="12" />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Security Deposit (Months of Rent)</Label>
                        <Input type="number" placeholder="1" />
                      </div>
                      <Button>Save Property Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose how you want to receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Add notification preferences here */}
                      <p className="text-sm text-muted-foreground">
                        Notification settings coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and authentication preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button variant="outline">Change Password</Button>
                      <Button variant="outline">Enable Two-Factor Authentication</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Information</CardTitle>
                    <CardDescription>
                      Manage your billing information and subscription
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Add billing information here */}
                      <p className="text-sm text-muted-foreground">
                        Billing settings coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
