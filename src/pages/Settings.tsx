import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { TopBar } from "@/components/layout/TopBar";
import { useState, useEffect } from "react";
import { User, Shield, Building2, Check, Loader2, Landmark, PenTool } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [showDwollaSetup, setShowDwollaSetup] = useState(false);
  const [dwollaBankForm, setDwollaBankForm] = useState({
    routingNumber: "",
    accountNumber: "",
    bankAccountType: "checking" as "checking" | "savings",
    name: "",
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

  // Query all payment processors for user (to determine preference)
  const { data: paymentProcessors, isLoading: processorsLoading } = useQuery({
    queryKey: ["paymentProcessors", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_processors")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user && userProfile?.role === "property_manager",
  });

  // Extract Dwolla processor for existing UI
  const dwollaProcessor = paymentProcessors?.find(p => p.processor === "dwolla") || null;


  // Create Dwolla customer mutation
  const createDwollaCustomerMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("dwolla-create-customer", {
        body: {
          firstName: profile.first_name || userProfile?.first_name,
          lastName: profile.last_name || userProfile?.last_name,
          email: profile.email || userProfile?.email,
          type: "personal",
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentProcessors"] });
      toast({ title: "Success", description: "Dwolla customer created. Now add your bank account." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add Dwolla bank account mutation
  const addDwollaBankMutation = useMutation({
    mutationFn: async (bankData: typeof dwollaBankForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("dwolla-add-funding-source", {
        body: bankData,
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["paymentProcessors"] });
      setShowDwollaSetup(false);
      setDwollaBankForm({ routingNumber: "", accountNumber: "", bankAccountType: "checking", name: "" });
      toast({
        title: "Bank Account Added",
        description: data.verified
          ? "Your bank account has been verified and is ready to receive payments."
          : "Your bank account has been added. Please verify via micro-deposits.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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
        <div className="flex min-h-screen w-full bg-background">
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
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col gap-8 max-w-4xl">
            <TopBar title="Settings" subtitle="Manage your account settings and preferences" />

            {/* Profile Settings */}
            <Card className="glass-card">
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
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Last Name</Label>
                    <Input
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-white/[0.04] border-white/[0.08] text-gray-400"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Phone Number</Label>
                  <Input
                    value={profile.phone_number}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <Separator className="bg-gray-600" />
                <div className="space-y-2">
                  <Label className="text-gray-300">Address</Label>
                  <Input
                    value={profile.address_line1}
                    onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] text-white"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">City</Label>
                    <Input
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">State</Label>
                    <Input
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Postal Code</Label>
                    <Input
                      value={profile.postal_code}
                      onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
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
            <Card className="glass-card">
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

            {/* Payment Settings (for property managers) */}
            {userProfile?.role === "property_manager" && (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white">Payment Settings</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure ACH bank transfers to receive rent payments from tenants
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Dwolla ACH Info */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                    <Building2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">Dwolla ACH Bank Transfers</span>
                        {dwollaProcessor?.status === "active" ? (
                          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                            <Check className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : dwollaProcessor ? (
                          <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/50">
                            Setup Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/50">
                            Not Configured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        Low-fee bank transfers for rent payments
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">
                          <span className="text-green-500">$0.25 flat</span> per transaction (up to $10,000)
                        </span>
                        <span className="text-gray-500">3-5 day transfers</span>
                      </div>
                      {dwollaProcessor?.dwolla_funding_source_name && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                          <Landmark className="h-3 w-3" />
                          {dwollaProcessor.dwolla_funding_source_name}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-gray-600" />

                  {/* Dwolla ACH Setup */}
                  <div className="space-y-3">
                    <Label className="text-gray-300">Dwolla ACH Account</Label>
                    {!dwollaProcessor ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => createDwollaCustomerMutation.mutate()}
                          disabled={createDwollaCustomerMutation.isPending}
                          className="gap-2"
                        >
                          {createDwollaCustomerMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                          Set Up Dwolla ACH
                        </Button>
                        <p className="text-xs text-gray-500">
                          Create a Dwolla account to accept low-fee bank transfers
                        </p>
                      </>
                    ) : !dwollaProcessor.dwolla_funding_source_id ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setShowDwollaSetup(true)}
                          className="gap-2"
                        >
                          <Landmark className="h-4 w-4" />
                          Add Bank Account
                        </Button>
                        <p className="text-xs text-gray-500">
                          Link your bank account to receive ACH payments
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <Check className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm text-green-400">Bank Account Connected</p>
                            <p className="text-xs text-gray-400">{dwollaProcessor.dwolla_funding_source_name}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDwollaSetup(true)}
                          className="text-xs text-gray-400"
                        >
                          Change Bank Account
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* E-Signature Settings (for property managers) */}
            {userProfile?.role === "property_manager" && (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white">E-Signature Settings</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure electronic signatures for lease agreements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-brand-indigo bg-brand-indigo/10">
                    <PenTool className="h-5 w-5 text-brand-indigo-light mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">Dropbox Sign</span>
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                          <Check className="h-3 w-3 mr-1" /> Configured
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        Legally binding e-signatures for lease agreements
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>~$0.80-$1.00 per signature</span>
                        <span>Embedded signing</span>
                        <span>Audit trail included</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Send lease agreements for signature directly from the Leases page. Tenants will receive
                    an email notification and can sign electronically.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Dwolla Bank Account Setup Dialog */}
            <Dialog open={showDwollaSetup} onOpenChange={setShowDwollaSetup}>
              <DialogContent className="bg-white/[0.04] border-white/[0.08] border-white/[0.08]">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Bank Account</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Enter your bank account details to receive ACH payments. In sandbox mode, accounts are auto-verified.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Account Holder Name</Label>
                    <Input
                      placeholder="John Smith"
                      value={dwollaBankForm.name}
                      onChange={(e) => setDwollaBankForm({ ...dwollaBankForm, name: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Routing Number (9 digits)</Label>
                    <Input
                      placeholder="222222226"
                      value={dwollaBankForm.routingNumber}
                      onChange={(e) => setDwollaBankForm({ ...dwollaBankForm, routingNumber: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                    <p className="text-xs text-gray-500">For sandbox testing, use: 222222226</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Account Number</Label>
                    <Input
                      placeholder="123456789"
                      value={dwollaBankForm.accountNumber}
                      onChange={(e) => setDwollaBankForm({ ...dwollaBankForm, accountNumber: e.target.value.replace(/\D/g, "") })}
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                    <p className="text-xs text-gray-500">For sandbox testing, use any digits</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Account Type</Label>
                    <RadioGroup
                      value={dwollaBankForm.bankAccountType}
                      onValueChange={(v: "checking" | "savings") => setDwollaBankForm({ ...dwollaBankForm, bankAccountType: v })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="checking" id="checking" />
                        <Label htmlFor="checking" className="text-gray-300">Checking</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="savings" id="savings" />
                        <Label htmlFor="savings" className="text-gray-300">Savings</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowDwollaSetup(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => addDwollaBankMutation.mutate(dwollaBankForm)}
                    disabled={addDwollaBankMutation.isPending || !dwollaBankForm.name || !dwollaBankForm.routingNumber || !dwollaBankForm.accountNumber}
                  >
                    {addDwollaBankMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Add Bank Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
