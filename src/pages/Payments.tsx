import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PaymentHistory } from "@/components/tenant/PaymentHistory";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { DwollaPaymentForm } from "@/components/payments/DwollaPaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, XCircle, Filter, Calendar, Search, CreditCard, Building2, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Payments = () => {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Get user role, active unit, and property manager's payment processor preference
  const { data: userInfo, isLoading: isLoadingUserInfo, error: userInfoError } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // If user is a tenant, get their active unit and property manager info
      let activeUnit = null;
      let landlordId = null;
      let paymentProcessor = "stripe"; // Default to Stripe

      if (profile?.role === 'tenant') {
        const { data: tenantUnit } = await supabase
          .from('tenant_units')
          .select(`
            unit_id,
            unit:units (
              id,
              unit_number,
              monthly_rent,
              property:properties (
                id,
                created_by
              )
            )
          `)
          .eq('tenant_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        activeUnit = tenantUnit?.unit;
        landlordId = tenantUnit?.unit?.property?.created_by;

        // Check property manager's payment processor preference
        if (landlordId) {
          console.log('[Payments] Checking payment processors for landlord:', landlordId);

          // First, get ALL processors for this landlord
          const { data: allProcessors, error: allProcessorsError } = await supabase
            .from('payment_processors')
            .select('processor, is_primary, status')
            .eq('user_id', landlordId);

          console.log('[Payments] All landlord processors:', allProcessors);
          console.log('[Payments] All processors error:', allProcessorsError);

          if (allProcessors && allProcessors.length > 0) {
            // Check for active processors
            const hasActiveStripe = allProcessors.some(p => p.processor === 'stripe' && p.status === 'active');
            const hasActiveDwolla = allProcessors.some(p => p.processor === 'dwolla' && p.status === 'active');

            console.log('[Payments] hasActiveStripe:', hasActiveStripe, 'hasActiveDwolla:', hasActiveDwolla);

            // Find the primary processor (if explicitly set)
            const primaryProcessor = allProcessors.find(p => p.is_primary === true);
            console.log('[Payments] Primary processor:', primaryProcessor);

            // Determine which processor to use
            if (primaryProcessor) {
              // Use explicitly set primary processor
              if (primaryProcessor.processor === 'dwolla' && primaryProcessor.status === 'active') {
                paymentProcessor = 'dwolla';
              } else if (primaryProcessor.processor === 'stripe') {
                paymentProcessor = 'stripe';
              }
            } else {
              // No explicit primary set - use active Dwolla if available (lower fees)
              // This handles the case where landlord set up Dwolla but is_primary wasn't properly saved
              if (hasActiveDwolla) {
                console.log('[Payments] No primary set, defaulting to active Dwolla');
                paymentProcessor = 'dwolla';
              }
            }

            // If landlord has BOTH active processors, show tabs
            if (hasActiveStripe && hasActiveDwolla) {
              // Determine which should be default in tabs
              const dwollaIsPrimary = primaryProcessor?.processor === 'dwolla' || (!primaryProcessor && hasActiveDwolla);
              paymentProcessor = dwollaIsPrimary ? 'both_dwolla_default' : 'both_stripe_default';
              console.log('[Payments] Both processors available, showing tabs. Default:', paymentProcessor);
            }
          }

          console.log('[Payments] Final paymentProcessor decision:', paymentProcessor);
        }
      }

      return {
        role: profile?.role,
        activeUnit,
        landlordId,
        paymentProcessor
      };
    },
  });

  useEffect(() => {
    if (success) {
      toast.success("Payment successful!");
    }
    if (canceled) {
      toast.error("Payment canceled.");
    }
  }, [success, canceled]);

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments", statusFilter, dateFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let query = supabase
        .from("rent_payments")
        .select(`
          id,
          amount,
          payment_date,
          status,
          payment_method,
          invoice_number,
          unit:units(
            unit_number,
            property_id
          )
        `);

      // Apply role-based filters
      if (userInfo?.role === 'tenant') {
        query = query.eq("tenant_id", user.id);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply date filter
      if (dateFilter === "thisMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        query = query.gte("payment_date", startOfMonth.toISOString());
      } else if (dateFilter === "lastMonth") {
        const startOfLastMonth = new Date();
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        startOfLastMonth.setDate(1);
        const endOfLastMonth = new Date();
        endOfLastMonth.setDate(0);
        query = query
          .gte("payment_date", startOfLastMonth.toISOString())
          .lte("payment_date", endOfLastMonth.toISOString());
      }

      console.log('Fetching payments for user:', user.id);
      const { data, error } = await query.order("payment_date", { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      console.log('Fetched payments:', data);
      return data;
    },
  });

  const filteredPayments = payments?.filter(payment => 
    payment.unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoadingPayments || isLoadingUserInfo) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex-1 p-4 sm:p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (userInfoError) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex-1 p-4 sm:p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load user information. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
          {success && (
            <Alert className="bg-green-500/15 text-green-500 border-green-500/50">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Payment successful! Your payment has been processed.
              </AlertDescription>
            </Alert>
          )}
          
          {canceled && (
            <Alert className="bg-red-500/15 text-red-500 border-red-500/50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Payment was canceled. Please try again if you wish to complete the payment.
              </AlertDescription>
            </Alert>
          )}

          {/* Show message for tenants without an active unit */}
          {userInfo?.role === 'tenant' && !userInfo.activeUnit && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are not currently assigned to any unit. Please contact your property manager to be assigned to a unit before making payments.
              </AlertDescription>
            </Alert>
          )}

          {/* Show payment form only for tenants with active units */}
          {userInfo?.role === 'tenant' && userInfo.activeUnit && (
            <>
              {/* Stripe only */}
              {userInfo.paymentProcessor === 'stripe' && (
                <PaymentForm
                  unitId={userInfo.activeUnit.id}
                  amount={userInfo.activeUnit.monthly_rent}
                />
              )}

              {/* Dwolla only */}
              {userInfo.paymentProcessor === 'dwolla' && userInfo.landlordId && (
                <DwollaPaymentForm
                  unitId={userInfo.activeUnit.id}
                  amount={userInfo.activeUnit.monthly_rent}
                  landlordId={userInfo.landlordId}
                />
              )}

              {/* Both payment methods available - show tabs */}
              {(userInfo.paymentProcessor === 'both_stripe_default' || userInfo.paymentProcessor === 'both_dwolla_default') && userInfo.landlordId && (
                <Tabs defaultValue={userInfo.paymentProcessor === 'both_dwolla_default' ? 'dwolla' : 'stripe'} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="stripe" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Card Payment
                    </TabsTrigger>
                    <TabsTrigger value="dwolla" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bank Transfer (ACH)
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="stripe">
                    <PaymentForm
                      unitId={userInfo.activeUnit.id}
                      amount={userInfo.activeUnit.monthly_rent}
                    />
                  </TabsContent>
                  <TabsContent value="dwolla">
                    <DwollaPaymentForm
                      unitId={userInfo.activeUnit.id}
                      amount={userInfo.activeUnit.monthly_rent}
                      landlordId={userInfo.landlordId}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px] relative">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filteredPayments && filteredPayments.length > 0 ? (
                  <PaymentHistory payments={filteredPayments} />
                ) : (
                  <Alert>
                    <AlertDescription>
                      No payments found. {userInfo?.role === 'tenant' && "Use the payment form above to make a payment."}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Payments;