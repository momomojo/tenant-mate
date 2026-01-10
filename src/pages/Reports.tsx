import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, DollarSign, Home, Users } from "lucide-react";

const Reports = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  // Rent Roll Report - shows all units with tenant info and rent amounts
  const { data: rentRoll } = useQuery({
    queryKey: ["rentRoll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select(`
          id,
          unit_number,
          monthly_rent,
          status,
          property:properties(name, address),
          tenant_units(
            tenant:profiles(first_name, last_name, email),
            lease_start_date,
            lease_end_date,
            status
          )
        `)
        .order("unit_number");
      if (error) throw error;
      return data;
    },
  });

  // Income Report - shows payment history
  const { data: incomeReport } = useQuery({
    queryKey: ["incomeReport"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_payments")
        .select(`
          id,
          amount,
          status,
          payment_date,
          payment_method,
          unit:units(
            unit_number,
            property:properties(name)
          ),
          tenant:profiles(first_name, last_name)
        `)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Property Summary
  const { data: propertySummary } = useQuery({
    queryKey: ["propertySummary"],
    queryFn: async () => {
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          address,
          units(id, monthly_rent, status)
        `);
      if (propError) throw propError;

      return properties?.map(property => {
        const units = property.units || [];
        const totalUnits = units.length;
        const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;
        const totalRent = units.reduce((sum: number, u: any) => sum + (parseFloat(u.monthly_rent) || 0), 0);
        const potentialIncome = totalRent;
        const actualIncome = units
          .filter((u: any) => u.status === "occupied")
          .reduce((sum: number, u: any) => sum + (parseFloat(u.monthly_rent) || 0), 0);

        return {
          ...property,
          totalUnits,
          occupiedUnits,
          vacancyRate: totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits * 100).toFixed(1) : 0,
          potentialIncome,
          actualIncome,
        };
      });
    },
  });

  const totalPotentialIncome = propertySummary?.reduce((sum, p) => sum + p.potentialIncome, 0) || 0;
  const totalActualIncome = propertySummary?.reduce((sum, p) => sum + p.actualIncome, 0) || 0;
  const totalUnits = propertySummary?.reduce((sum, p) => sum + p.totalUnits, 0) || 0;
  const totalOccupied = propertySummary?.reduce((sum, p) => sum + p.occupiedUnits, 0) || 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#1A1F2C]">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col gap-8">
            <TopBar title="Reports" subtitle="View property and financial reports" />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-[#403E43] border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Properties</CardTitle>
                  <Home className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{propertySummary?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-[#403E43] border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Units</CardTitle>
                  <BarChart className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{totalUnits}</div>
                  <p className="text-xs text-gray-400">{totalOccupied} occupied</p>
                </CardContent>
              </Card>
              <Card className="bg-[#403E43] border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Potential Monthly Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">${totalPotentialIncome.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-[#403E43] border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Current Monthly Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">${totalActualIncome.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="rent-roll" className="w-full">
              <TabsList className="bg-[#403E43]">
                <TabsTrigger value="rent-roll">Rent Roll</TabsTrigger>
                <TabsTrigger value="income">Income Report</TabsTrigger>
                <TabsTrigger value="property">Property Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="rent-roll">
                <Card className="bg-[#403E43] border-none">
                  <CardHeader>
                    <CardTitle className="text-white">Rent Roll</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-300">Property</TableHead>
                          <TableHead className="text-gray-300">Unit</TableHead>
                          <TableHead className="text-gray-300">Tenant</TableHead>
                          <TableHead className="text-gray-300">Lease Dates</TableHead>
                          <TableHead className="text-gray-300">Monthly Rent</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rentRoll?.map((unit: any) => {
                          const activeLease = unit.tenant_units?.find((tu: any) => tu.status === "active");
                          return (
                            <TableRow key={unit.id}>
                              <TableCell className="text-white">{unit.property?.name}</TableCell>
                              <TableCell className="text-gray-300">{unit.unit_number}</TableCell>
                              <TableCell className="text-gray-300">
                                {activeLease?.tenant
                                  ? `${activeLease.tenant.first_name} ${activeLease.tenant.last_name}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {activeLease
                                  ? `${activeLease.lease_start_date} - ${activeLease.lease_end_date}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-white">${parseFloat(unit.monthly_rent).toLocaleString()}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  unit.status === "occupied" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                                }`}>
                                  {unit.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="income">
                <Card className="bg-[#403E43] border-none">
                  <CardHeader>
                    <CardTitle className="text-white">Income Report</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {incomeReport && incomeReport.length > 0 ? (
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-gray-300">Date</TableHead>
                            <TableHead className="text-gray-300">Property/Unit</TableHead>
                            <TableHead className="text-gray-300">Tenant</TableHead>
                            <TableHead className="text-gray-300">Amount</TableHead>
                            <TableHead className="text-gray-300">Method</TableHead>
                            <TableHead className="text-gray-300">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomeReport.map((payment: any) => (
                            <TableRow key={payment.id}>
                              <TableCell className="text-gray-300">
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-white">
                                {payment.unit?.property?.name} - Unit {payment.unit?.unit_number}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {payment.tenant?.first_name} {payment.tenant?.last_name}
                              </TableCell>
                              <TableCell className="text-white">${parseFloat(payment.amount).toLocaleString()}</TableCell>
                              <TableCell className="text-gray-300">{payment.payment_method || "-"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  payment.status === "completed" ? "bg-green-500/20 text-green-400" :
                                  payment.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-red-500/20 text-red-400"
                                }`}>
                                  {payment.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-400 text-center py-8">No payment history yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="property">
                <Card className="bg-[#403E43] border-none">
                  <CardHeader>
                    <CardTitle className="text-white">Property Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-300">Property</TableHead>
                          <TableHead className="text-gray-300">Address</TableHead>
                          <TableHead className="text-gray-300">Units</TableHead>
                          <TableHead className="text-gray-300">Occupied</TableHead>
                          <TableHead className="text-gray-300">Vacancy Rate</TableHead>
                          <TableHead className="text-gray-300">Potential Income</TableHead>
                          <TableHead className="text-gray-300">Current Income</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propertySummary?.map((property: any) => (
                          <TableRow key={property.id}>
                            <TableCell className="text-white font-medium">{property.name}</TableCell>
                            <TableCell className="text-gray-300">{property.address}</TableCell>
                            <TableCell className="text-gray-300">{property.totalUnits}</TableCell>
                            <TableCell className="text-gray-300">{property.occupiedUnits}</TableCell>
                            <TableCell>
                              <span className={`${
                                parseFloat(property.vacancyRate) > 20 ? "text-red-400" : "text-green-400"
                              }`}>
                                {property.vacancyRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300">${property.potentialIncome.toLocaleString()}</TableCell>
                            <TableCell className="text-green-400">${property.actualIncome.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
