import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PaymentHistory } from "@/components/tenant/PaymentHistory";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, XCircle, Filter, Calendar, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Get user role
  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      return profile?.role;
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
      if (userRole === 'tenant') {
        query = query.eq("tenant_id", user.id);
      }

      // Apply status filter
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

      const { data, error } = await query.order("payment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: activeUnit, isLoading: isLoadingUnit } = useQuery({
    queryKey: ["active-unit"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("tenant_units")
        .select(`
          unit_id,
          unit:units(id, unit_number, monthly_rent)
        `)
        .eq("tenant_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const filteredPayments = payments?.filter(payment => 
    payment.unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoadingPayments || isLoadingUnit) {
    return <div>Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <div className="flex-1 p-6 space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {userRole === 'tenant' && activeUnit && (
                <PaymentForm
                  unitId={activeUnit.unit_id}
                  amount={activeUnit.unit.monthly_rent}
                />
              )}

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
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px]">
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
                {filteredPayments && <PaymentHistory payments={filteredPayments} />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Payments;