import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TenantInfoProps {
  tenant: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function TenantInfo({ tenant }: TenantInfoProps) {
  const initials = `${tenant.first_name?.[0] || ""}${tenant.last_name?.[0] || ""}`;
  const fullName = [tenant.first_name, tenant.last_name].filter(Boolean).join(" ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Information</CardTitle>
      </CardHeader>
      <CardContent className="flex items-start space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">{fullName}</h3>
          <p className="text-sm text-gray-400">{tenant.email}</p>
        </div>
      </CardContent>
    </Card>
  );
}