import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApplicants, useUpdateApplicant, useDeleteApplicant, useApplicantCounts, type Applicant } from "@/hooks/useApplicants";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ApplicantCard } from "@/components/applicants/ApplicantCard";
import { ApplicantFilters } from "@/components/applicants/ApplicantFilters";
import { InviteApplicantDialog } from "@/components/applicants/InviteApplicantDialog";
import { ConvertApplicantDialog } from "@/components/applicants/ConvertApplicantDialog";
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
import { Users, UserCheck, UserX, Clock, FileSearch } from "lucide-react";

export default function Applicants() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [propertyFilter, setPropertyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applicantToDelete, setApplicantToDelete] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [applicantToConvert, setApplicantToConvert] = useState<Applicant | null>(null);

  const { data: applicants, isLoading } = useApplicants({
    propertyId: propertyFilter || undefined,
    status: statusFilter || undefined,
    search: searchFilter || undefined,
  });

  const { data: counts } = useApplicantCounts(propertyFilter || undefined);
  const { mutate: updateApplicant } = useUpdateApplicant();
  const { mutate: deleteApplicant } = useDeleteApplicant();

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

  const handleApprove = (applicantId: string) => {
    updateApplicant(
      { applicantId, status: "approved" },
      {
        onSuccess: () => {
          toast({
            title: "Applicant approved",
            description: "The applicant has been approved and can now be converted to a tenant.",
          });
        },
      }
    );
  };

  const handleReject = (applicantId: string) => {
    updateApplicant(
      { applicantId, status: "rejected" },
      {
        onSuccess: () => {
          toast({
            title: "Applicant rejected",
            description: "The application has been rejected.",
          });
        },
      }
    );
  };

  const handleStartScreening = (applicantId: string) => {
    updateApplicant(
      { applicantId, status: "screening" },
      {
        onSuccess: () => {
          toast({
            title: "Screening started",
            description: "Background and credit check has been initiated.",
          });
          // TODO: Integrate with real screening provider (see feature/tenant-screening branch)
        },
      }
    );
  };

  const handleConvert = (applicant: Applicant) => {
    setApplicantToConvert(applicant);
    setConvertDialogOpen(true);
  };

  const handleDelete = () => {
    if (applicantToDelete) {
      deleteApplicant(applicantToDelete, {
        onSuccess: () => {
          toast({
            title: "Applicant deleted",
            description: "The applicant has been removed.",
          });
          setDeleteDialogOpen(false);
          setApplicantToDelete(null);
        },
      });
    }
  };

  const filteredByTab = applicants?.filter((a) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return ["invited", "started", "submitted"].includes(a.status);
    if (activeTab === "screening") return a.status === "screening";
    if (activeTab === "approved") return a.status === "approved";
    if (activeTab === "rejected") return a.status === "rejected";
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
                <h1 className="text-2xl font-bold">Applicants</h1>
                <p className="text-muted-foreground">
                  Manage rental applications and tenant screening
                </p>
              </div>
              <InviteApplicantDialog />
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{counts?.total || 0}</span>
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
                    <span className="text-2xl font-bold">
                      {(counts?.invited || 0) + (counts?.started || 0) + (counts?.submitted || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Screening
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-orange-600" />
                    <span className="text-2xl font-bold">{counts?.screening || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Approved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">{counts?.approved || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Rejected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold">{counts?.rejected || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <ApplicantFilters
              propertyId={propertyFilter}
              onPropertyChange={setPropertyFilter}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              search={searchFilter}
              onSearchChange={setSearchFilter}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="screening">Screening</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-48" />
                    ))}
                  </div>
                ) : filteredByTab?.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium">No applicants found</h3>
                    <p className="text-muted-foreground mt-1">
                      {activeTab === "all"
                        ? "Invite your first applicant to get started"
                        : `No applicants with ${activeTab} status`}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredByTab?.map((applicant) => (
                      <ApplicantCard
                        key={applicant.id}
                        applicant={applicant}
                        onApprove={() => handleApprove(applicant.id)}
                        onReject={() => handleReject(applicant.id)}
                        onStartScreening={() => handleStartScreening(applicant.id)}
                        onConvert={() => handleConvert(applicant)}
                        onDelete={() => {
                          setApplicantToDelete(applicant.id);
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
            <AlertDialogTitle>Delete Applicant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this applicant? This action cannot be undone.
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

      {/* Convert to Tenant Dialog */}
      {applicantToConvert && (
        <ConvertApplicantDialog
          applicant={applicantToConvert}
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          onSuccess={() => {
            setApplicantToConvert(null);
          }}
        />
      )}
    </SidebarProvider>
  );
}
