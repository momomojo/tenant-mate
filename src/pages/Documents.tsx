import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { DocumentUpload } from "@/components/property/DocumentUpload";
import { DocumentList } from "@/components/property/DocumentList";

const Documents = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

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
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">
            <h1 className="text-2xl font-semibold text-white">Documents</h1>

            <div className="grid gap-8">
              <Card className="bg-[#403E43] border-none p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Property Documents</h2>
                  {selectedPropertyId && (
                    <DocumentUpload
                      propertyId={selectedPropertyId}
                      onUploadComplete={() => {
                        // Refresh documents
                      }}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <select
                    className="w-full p-2 rounded bg-[#2D2B30] text-white border border-gray-600"
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
                    <DocumentList
                      propertyId={selectedPropertyId}
                      onDocumentDeleted={() => {
                        // Refresh documents
                      }}
                    />
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Documents;