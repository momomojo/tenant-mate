import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Landmark, Loader2, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface DwollaPaymentFormProps {
  unitId: string;
  amount?: number;
  landlordId: string;
}

export function DwollaPaymentForm({ unitId, amount: defaultAmount, landlordId }: DwollaPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState<number | null>(null);
  const [bankForm, setBankForm] = useState({
    routingNumber: "",
    accountNumber: "",
    bankAccountType: "checking" as "checking" | "savings",
    name: "",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get tenant's Dwolla processor status
  const { data: tenantProcessor, isLoading: processorLoading } = useQuery({
    queryKey: ["tenantDwollaProcessor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("payment_processors")
        .select("*")
        .eq("user_id", user.id)
        .eq("processor", "dwolla")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch monthly rent
  const fetchMonthlyRent = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: lease, error: leaseError } = await supabase
        .from('tenant_units')
        .select(`
          unit:units (
            monthly_rent
          )
        `)
        .eq('tenant_id', user.id)
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .single();

      if (leaseError) {
        console.error('Error fetching lease:', leaseError);
        return;
      }

      if (lease?.unit?.monthly_rent) {
        setMonthlyRent(lease.unit.monthly_rent);
      } else {
        setMonthlyRent(defaultAmount || 0);
      }
    } catch (error) {
      console.error('Error fetching monthly rent:', error);
      toast.error('Failed to fetch monthly rent amount');
    }
  }, [unitId, defaultAmount]);

  useEffect(() => {
    fetchMonthlyRent();
  }, [fetchMonthlyRent]);

  // Create Dwolla customer for tenant
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const response = await supabase.functions.invoke("dwolla-create-customer", {
        body: {
          firstName: profile.first_name || "Tenant",
          lastName: profile.last_name || "User",
          email: profile.email,
          type: "personal",
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantDwollaProcessor"] });
      toast.success("Account created. Now add your bank account.");
      setShowBankSetup(true);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add bank account for tenant
  const addBankMutation = useMutation({
    mutationFn: async (bankData: typeof bankForm) => {
      const response = await supabase.functions.invoke("dwolla-add-funding-source", {
        body: bankData,
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenantDwollaProcessor"] });
      setShowBankSetup(false);
      setBankForm({ routingNumber: "", accountNumber: "", bankAccountType: "checking", name: "" });
      toast.success(
        data.verified
          ? "Bank account verified and ready for payments."
          : "Bank account added. Please verify via micro-deposits."
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Initiate Dwolla payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!monthlyRent) throw new Error("Unable to determine payment amount");

      // Create a rent_payment record first
      const { data: payment, error: paymentError } = await supabase
        .from("rent_payments")
        .insert({
          tenant_id: user.id,
          unit_id: unitId,
          amount: monthlyRent,
          status: "pending",
          payment_method: "ach",
          due_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (paymentError) throw new Error("Failed to create payment record");

      // Initiate the Dwolla transfer
      const response = await supabase.functions.invoke("dwolla-initiate-transfer", {
        body: {
          rentPaymentId: payment.id,
          amount: monthlyRent,
        },
      });

      if (response.error) {
        // Clean up the payment record if transfer fails
        await supabase.from("rent_payments").delete().eq("id", payment.id);
        throw new Error(response.error.message || "Transfer initiation failed");
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success(data.message || "ACH transfer initiated. Funds typically arrive in 1-2 business days.");
      navigate("/payments?success=true");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate payment");
    },
  });

  const handlePayment = async () => {
    if (!tenantProcessor?.dwolla_funding_source_id) {
      toast.error("Please set up your bank account first");
      return;
    }

    if (!monthlyRent) {
      toast.error("Unable to process payment. Monthly rent amount not found.");
      return;
    }

    initiatePaymentMutation.mutate();
  };

  const hasBankAccount = tenantProcessor?.dwolla_funding_source_id && tenantProcessor.status === "active";
  const hasCustomer = tenantProcessor?.dwolla_customer_id;

  if (processorLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Pay via Bank Transfer (ACH)
          </CardTitle>
          <CardDescription>
            Low-fee bank transfer powered by Dwolla. Only $0.25 per transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCustomer && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To pay via ACH, you need to set up your Dwolla account and link a bank account.
              </AlertDescription>
            </Alert>
          )}

          {hasCustomer && !hasBankAccount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please add your bank account to make ACH payments.
              </AlertDescription>
            </Alert>
          )}

          {hasBankAccount && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Bank Account Connected</p>
                <p className="text-xs text-muted-foreground">{tenantProcessor.dwolla_funding_source_name}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Monthly Rent Amount</Label>
            <Input
              id="amount"
              value={monthlyRent || 0}
              readOnly
              type="number"
              className="bg-muted"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <div className="flex justify-between text-sm">
              <span>Payment amount</span>
              <span>${monthlyRent?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing fee</span>
              <span>$0.25</span>
            </div>
            <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t">
              <span>Total</span>
              <span>${((monthlyRent || 0) + 0.25).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {!hasCustomer && (
            <Button
              onClick={() => createCustomerMutation.mutate()}
              disabled={createCustomerMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {createCustomerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Set Up Dwolla Account
                </>
              )}
            </Button>
          )}

          {hasCustomer && !hasBankAccount && (
            <Button
              onClick={() => setShowBankSetup(true)}
              variant="outline"
              className="w-full"
            >
              <Landmark className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          )}

          {hasBankAccount && (
            <>
              <Button
                onClick={handlePayment}
                disabled={initiatePaymentMutation.isPending || !monthlyRent}
                className="w-full"
              >
                {initiatePaymentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${monthlyRent?.toFixed(2) || "0.00"} via ACH`
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBankSetup(true)}
                className="text-xs text-muted-foreground"
              >
                Change Bank Account
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Bank Account Setup Dialog */}
      <Dialog open={showBankSetup} onOpenChange={setShowBankSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Enter your bank account details for ACH payments. Your information is securely processed by Dwolla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input
                placeholder="John Smith"
                value={bankForm.name}
                onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Routing Number (9 digits)</Label>
              <Input
                placeholder="222222226"
                value={bankForm.routingNumber}
                onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value.replace(/\D/g, "").slice(0, 9) })}
              />
              <p className="text-xs text-muted-foreground">For testing, use: 222222226</p>
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                placeholder="123456789"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <RadioGroup
                value={bankForm.bankAccountType}
                onValueChange={(v: "checking" | "savings") => setBankForm({ ...bankForm, bankAccountType: v })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checking" id="checking" />
                  <Label htmlFor="checking">Checking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="savings" id="savings" />
                  <Label htmlFor="savings">Savings</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBankSetup(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addBankMutation.mutate(bankForm)}
              disabled={addBankMutation.isPending || !bankForm.name || !bankForm.routingNumber || !bankForm.accountNumber}
            >
              {addBankMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Bank Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
