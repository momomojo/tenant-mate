import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLeases, useUpdateLease, useDeleteLease, useLeaseCounts } from "@/hooks/useLeases";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { LeaseCard } from "@/components/leases/LeaseCard";
import { LeaseFilters } from "@/components/leases/LeaseFilters";
import { CreateLeaseDialog } from "@/components/leases/CreateLeaseDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Clock, CheckCircle, XCircle, RefreshCw, Edit } from "lucide-react";

export default function Leases() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [propertyFilter, setPropertyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<string | null>(null);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [leaseToTerminate, setLeaseToTerminate] = useState<string | null>(null);

  const { data: leases, isLoading } = useLeases({
    propertyId: propertyFilter || undefined,
    status: statusFilter || undefined,
  });

  const { data: counts } = useLeaseCounts(propertyFilter || undefined);
  const { mutate: updateLease } = useUpdateLease();
  const { mutate: deleteLease } = useDeleteLease();

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleView = (leaseId: string) => {
    // TODO: Implement lease detail view
    toast({
      title: "Coming soon",
      description: "Lease detail view will be available soon.",
    });
  };

  const handleEdit = (leaseId: string) => {
    // TODO: Implement edit functionality
    toast({
      title: "Coming soon",
      description: "Lease editing will be available soon.",
    });
  };

  const handleSendForSignature = (leaseId: string) => {
    updateLease(
      { leaseId, status: "pending", signatureStatus: "sent" },
      {
        onSuccess: () => {
          toast({
            title: "Sent for signature",
            description: "The lease has been sent to the tenant for signature.",
          });
          // TODO: Integrate with e-signature provider (DocuSign/HelloSign)
        },
      }
    );
  };

  const handleActivate = (leaseId: string) => {
    updateLease(
      { leaseId, status: "active" },
      {
        onSuccess: () => {
          toast({
            title: "Lease activated",
            description: "The lease is now active.",
          });
        },
      }
    );
  };

  const handleRenew = (leaseId: string) => {
    updateLease(
      { leaseId, status: "renewed" },
      {
        onSuccess: () => {
          toast({
            title: "Lease renewed",
            description: "The lease has been marked as renewed.",
          });
          // TODO: Create new lease based on old one
        },
      }
    );
  };

  const handleTerminate = () => {
    if (leaseToTerminate) {
      updateLease(
        { leaseId: leaseToTerminate, status: "terminated" },
        {
          onSuccess: () => {
            toast({
              title: "Lease terminated",
              description: "The lease has been terminated.",
            });
            setTerminateDialogOpen(false);
            setLeaseToTerminate(null);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (leaseToDelete) {
      deleteLease(leaseToDelete, {
        onSuccess: () => {
          toast({
            title: "Lease deleted",
            description: "The lease draft has been deleted.",
          });
          setDeleteDialogOpen(false);
          setLeaseToDelete(null);
        },
      });
    }
  };

  const filteredByTab = leases?.filter((lease) => {
    if (activeTab === "all") return true;
    if (activeTab === "drafts") return lease.status === "draft";
    if (activeTab === "pending") return lease.status === "pending";
    if (activeTab === "active") return ["signed", "active"].includes(lease.status);
    if (activeTab === "expired") return ["expired", "terminated"].includes(lease.status);
    return true;
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <TopBar />
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Leases</h1>
                <p className="text-muted-foreground">
                  Manage lease agreements and renewals
                </p>
              </div>
              <CreateLeaseDialog />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{counts?.total || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Drafts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-gray-600" />
                    <span className="text-2xl font-bold">{counts?.draft || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-2xl font-bold">{counts?.pending || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">
                      {(counts?.signed || 0) + (counts?.active || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Expired
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold">
                      {(counts?.expired || 0) + (counts?.terminated || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <LeaseFilters
              propertyId={propertyFilter}
              onPropertyChange={setPropertyFilter}
              status={statusFilter}
              onStatusChange={setStatusFilter}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-64" />
                    ))}
                  </div>
                ) : filteredByTab?.length === 0 ? (
                  <Card className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium">No leases found</h3>
                    <p className="text-muted-foreground mt-1">
                      {activeTab === "all"
                        ? "Create your first lease to get started"
                        : `No leases with ${activeTab} status`}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredByTab?.map((lease) => (
                      <LeaseCard
                        key={lease.id}
                        lease={lease}
                        onView={() => handleView(lease.id)}
                        onEdit={() => handleEdit(lease.id)}
                        onSendForSignature={() => handleSendForSignature(lease.id)}
                        onActivate={() => handleActivate(lease.id)}
                        onTerminate={() => {
                          setLeaseToTerminate(lease.id);
                          setTerminateDialogOpen(true);
                        }}
                        onRenew={() => handleRenew(lease.id)}
                        onDelete={() => {
                          setLeaseToDelete(lease.id);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lease Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lease draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Confirmation Dialog */}
      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Lease</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate this lease? This will end the lease agreement
              and may have legal implications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminate} className="bg-red-600 hover:bg-red-700">
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
