import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, User } from "lucide-react";

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
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Tenant Information
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-start space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-white">{fullName}</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{tenant.email}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}