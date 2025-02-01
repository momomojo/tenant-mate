import { useQuery } from "@tanstack/react-query";
import { Building2, Search, Users } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Properties = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          units:units(
            id,
            unit_number,
            status,
            tenant_units(
              tenant:tenant_id(
                first_name,
                last_name
              )
            )
          )
        `);

      if (error) throw error;
      return data;
    },
  });

  const filteredProperties = properties?.filter((property) =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Properties</h1>
              <p className="text-sm text-gray-400">Manage your properties and units</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button>
                <Building2 className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center text-gray-400">Loading properties...</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProperties?.map((property) => {
                  const totalUnits = property.units?.length || 0;
                  const occupiedUnits = property.units?.filter(
                    (unit) => unit.status === "occupied"
                  ).length || 0;
                  const occupancyRate = totalUnits > 0 
                    ? Math.round((occupiedUnits / totalUnits) * 100) 
                    : 0;

                  return (
                    <Card key={property.id} className="bg-[#403E43] border-none hover:bg-[#4A484D] transition-colors">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">
                          {property.name}
                        </CardTitle>
                        <p className="text-sm text-gray-400">{property.address}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-[#9b87f5]" />
                              <span className="text-sm text-gray-300">
                                {totalUnits} Units
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-[#9b87f5]" />
                              <span className="text-sm text-gray-300">
                                {occupancyRate}% Occupied
                              </span>
                            </div>
                          </div>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Properties;