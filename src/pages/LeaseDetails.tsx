import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLease } from "@/hooks/useLeases";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileText,
  PenTool,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Receipt,
  AlertCircle,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-500", icon: <FileText className="h-3 w-3" /> },
  pending: { label: "Pending", color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
  signed: { label: "Signed", color: "bg-blue-500", icon: <PenTool className="h-3 w-3" /> },
  active: { label: "Active", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: "Expired", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
  terminated: { label: "Terminated", color: "bg-red-600", icon: <XCircle className="h-3 w-3" /> },
  renewed: { label: "Renewed", color: "bg-purple-500", icon: <CheckCircle className="h-3 w-3" /> },
};

const signatureStatusConfig: Record<string, { label: string; color: string }> = {
  not_sent: { label: "Not Sent", color: "bg-gray-500" },
  sent: { label: "Sent", color: "bg-blue-500" },
  viewed: { label: "Viewed", color: "bg-yellow-500" },
  partially_signed: { label: "Partially Signed", color: "bg-orange-500" },
  completed: { label: "Completed", color: "bg-green-500" },
  declined: { label: "Declined", color: "bg-red-500" },
  expired: { label: "Expired", color: "bg-red-400" },
};

export default function LeaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lease, isLoading, error } = useLease(id);

  // Fetch recent payments for this lease's unit and tenant
  const { data: payments } = useQuery({
    queryKey: ["lease-payments", lease?.unit_id, lease?.tenant_id],
    queryFn: async () => {
      if (!lease?.unit_id || !lease?.tenant_id) return [];

      const { data, error } = await supabase
        .from("rent_payments")
        .select("id, amount, payment_date, status, payment_method")
        .eq("unit_id", lease.unit_id)
        .eq("tenant_id", lease.tenant_id)
        .order("payment_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!lease?.unit_id && !!lease?.tenant_id,
  });

  // Fetch related documents
  const { data: documents } = useQuery({
    queryKey: ["lease-documents", lease?.property_id, lease?.unit_id],
    queryFn: async () => {
      if (!lease?.property_id) return [];

      let query = supabase
        .from("documents")
        .select("id, name, category, file_url, created_at")
        .eq("property_id", lease.property_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (lease.unit_id) {
        query = query.or(`unit_id.eq.${lease.unit_id},unit_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!lease?.property_id,
  });

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const calculateTermLength = () => {
    if (!lease) return "-";
    const start = new Date(lease.lease_start);
    const end = new Date(lease.lease_end);
    const months = differenceInMonths(end, start);
    const days = differenceInDays(end, start) - months * 30;
    if (months === 12) return "1 year";
    if (months > 12) return `${Math.floor(months / 12)} years ${months % 12 ? `${months % 12} months` : ""}`;
    return `${months} months${days > 0 ? ` ${days} days` : ""}`;
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <TopBar />
            <div className="p-6 space-y-6">
              <Skeleton className="h-10 w-64" />
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (error || !lease) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <TopBar />
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error ? "Failed to load lease details." : "Lease not found."}
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate("/leases")} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leases
              </Button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const status = statusConfig[lease.status] || statusConfig.draft;
  const sigStatus = signatureStatusConfig[lease.signature_status] || signatureStatusConfig.not_sent;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <TopBar />
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/leases")}
                    className="shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                      {lease.property?.name} - Unit {lease.unit?.unit_number}
                      <Badge className={`${status.color} text-white ml-2`}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </h1>
                    <p className="text-muted-foreground">{lease.property?.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Terms Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    Lease Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenant</span>
                    <span className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {lease.tenant?.first_name} {lease.tenant?.last_name}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{format(new Date(lease.lease_start), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="font-medium">{format(new Date(lease.lease_end), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Term Length</span>
                    <span className="font-medium">{calculateTermLength()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="font-medium text-lg">${lease.monthly_rent.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span className="font-medium">${lease.security_deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Late Fee</span>
                    <span className="font-medium">${lease.late_fee} (after {lease.grace_period_days} days)</span>
                  </div>
                  {(lease.pet_deposit > 0 || lease.pet_rent > 0) && (
                    <>
                      <Separator />
                      {lease.pet_deposit > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pet Deposit</span>
                          <span className="font-medium">${lease.pet_deposit.toLocaleString()}</span>
                        </div>
                      )}
                      {lease.pet_rent > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pet Rent</span>
                          <span className="font-medium">${lease.pet_rent}/mo</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Signature Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-muted-foreground" />
                    E-Signature Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Signature Status</span>
                    <Badge className={`${sigStatus.color} text-white`}>
                      {sigStatus.label}
                    </Badge>
                  </div>
                  <Separator />
                  {lease.signature_provider && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="font-medium">{lease.signature_provider}</span>
                    </div>
                  )}
                  {lease.landlord_signed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Landlord Signed</span>
                      <span className="font-medium">{format(new Date(lease.landlord_signed_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  )}
                  {lease.tenant_signed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenant Signed</span>
                      <span className="font-medium">{format(new Date(lease.tenant_signed_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  )}
                  {lease.signed_document_url && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(lease.signed_document_url!, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Signed Document
                    </Button>
                  )}
                  {!lease.signed_document_url && lease.signature_status === "not_sent" && (
                    <p className="text-sm text-muted-foreground text-center">
                      Lease has not been sent for signature yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment History Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    Recent Payments
                  </CardTitle>
                  <CardDescription>Last 5 payments for this lease</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments && payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">${payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.payment_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge
                            className={
                              payment.status === "paid"
                                ? "bg-green-500"
                                : payment.status === "pending"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No payments recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Related Documents
                </CardTitle>
                <CardDescription>Documents associated with this property/unit</CardDescription>
              </CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => window.open(doc.file_url, "_blank")}
                      >
                        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.category} • {format(new Date(doc.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No documents found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
