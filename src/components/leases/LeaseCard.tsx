import { useState } from "react";
import { format, differenceInDays, isPast } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  MoreVertical,
  Calendar,
  DollarSign,
  Building2,
  User,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Trash2,
  Edit,
} from "lucide-react";
import type { Lease } from "@/hooks/useLeases";

interface LeaseCardProps {
  lease: Lease;
  onView: () => void;
  onEdit: () => void;
  onSendForSignature: () => void;
  onActivate: () => void;
  onTerminate: () => void;
  onRenew: () => void;
  onDelete: () => void;
}

const statusConfig: Record<Lease["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "secondary", icon: <Edit className="h-3 w-3" /> },
  pending: { label: "Pending Signature", variant: "outline", icon: <Clock className="h-3 w-3" /> },
  signed: { label: "Signed", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  active: { label: "Active", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  terminated: { label: "Terminated", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  renewed: { label: "Renewed", variant: "default", icon: <RefreshCw className="h-3 w-3" /> },
};

export function LeaseCard({
  lease,
  onView,
  onEdit,
  onSendForSignature,
  onActivate,
  onTerminate,
  onRenew,
  onDelete,
}: LeaseCardProps) {
  const status = statusConfig[lease.status];
  const leaseEnd = new Date(lease.lease_end);
  const daysUntilExpiry = differenceInDays(leaseEnd, new Date());
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = isPast(leaseEnd);

  const tenantName = lease.tenant
    ? `${lease.tenant.first_name || ""} ${lease.tenant.last_name || ""}`.trim() || lease.tenant.email
    : "Unknown Tenant";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lease Agreement
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{lease.property?.name}</span>
              {lease.unit && (
                <>
                  <span>-</span>
                  <span>Unit {lease.unit.unit_number}</span>
                </>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {lease.status === "draft" && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSendForSignature}>
                    <Send className="h-4 w-4 mr-2" />
                    Send for Signature
                  </DropdownMenuItem>
                </>
              )}
              {lease.status === "signed" && (
                <DropdownMenuItem onClick={onActivate}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Lease
                </DropdownMenuItem>
              )}
              {lease.status === "active" && (
                <>
                  <DropdownMenuItem onClick={onRenew}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Renew Lease
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onTerminate} className="text-red-600">
                    <XCircle className="h-4 w-4 mr-2" />
                    Terminate
                  </DropdownMenuItem>
                </>
              )}
              {lease.status === "draft" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tenant */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{tenantName}</span>
        </div>

        {/* Lease Period */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(lease.lease_start), "MMM d, yyyy")} -{" "}
            {format(leaseEnd, "MMM d, yyyy")}
          </span>
        </div>

        {/* Rent */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">${lease.monthly_rent.toLocaleString()}/month</span>
        </div>

        {/* Status and Expiry Warning */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant={status.variant} className="flex items-center gap-1">
            {status.icon}
            {status.label}
          </Badge>

          {lease.status === "active" && (
            <>
              {isExpired ? (
                <Badge variant="destructive" className="text-xs">
                  Expired
                </Badge>
              ) : isExpiringSoon ? (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                  Expires in {daysUntilExpiry} days
                </Badge>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
