import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { DocumentUpload } from "@/components/property/DocumentUpload";
import { DocumentList } from "@/components/property/DocumentList";
import { Building2, Database, FileText } from "lucide-react";
import { toast } from "sonner";

const Documents = () => {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Fetch user role
  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return profile?.role;
    },
  });

  // Fetch properties for property managers
  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: userRole === "property_manager",
  });

  // Fetch documents using the new view
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", selectedPropertyId],
    queryFn: async () => {
      let query = supabase
        .from("document_access_view")
        .select("*");

      if (userRole === "property_manager" && selectedPropertyId) {
        query = query.eq("property_id", selectedPropertyId);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Failed to fetch documents");
        throw error;
      }
      return data;
    },
  });

  const renderDocumentHeader = () => {
    switch (userRole) {
      case "admin":
        return (
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">All Documents</h2>
          </div>
        );
      case "property_manager":
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Property Documents</h2>
          </div>
        );
      case "tenant":
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">My Property Documents</h2>
          </div>
        );
      default:
        return null;
    }
  };

  const renderDocumentList = () => {
    if (isLoading) {
      return <div className="text-gray-400">Loading documents...</div>;
    }

    // Property managers need to see the property selector and upload UI even with no documents
    if (userRole === "property_manager") {
      return (
        <div className="space-y-4">
          <select
            className="w-full p-2 rounded bg-white/[0.04] text-white border border-white/[0.08]"
            value={selectedPropertyId || ""}
            onChange={(e) => setSelectedPropertyId(e.target.value || null)}
          >
            <option value="">Select a property</option>
            {properties?.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          {selectedPropertyId && (
            <>
              <DocumentUpload
                propertyId={selectedPropertyId}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["documents"] });
                }}
              />
              {documents?.length ? (
                <DocumentList
                  documents={documents}
                  showPropertyName={false}
                  showUploaderInfo={true}
                />
              ) : (
                <div className="text-gray-400">No documents found for this property.</div>
              )}
            </>
          )}
        </div>
      );
    }

    if (!documents?.length) {
      return <div className="text-gray-400">No documents found.</div>;
    }

    return (
      <DocumentList
        documents={documents}
        showPropertyName={userRole === "admin"}
        showUploaderInfo={userRole === "admin"}
      />
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-white">Documents</h1>

            <Card className="glass-card p-4 sm:p-6">
              <div className="space-y-6">
                {renderDocumentHeader()}
                {renderDocumentList()}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Documents;