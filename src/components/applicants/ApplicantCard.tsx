import { format } from "date-fns";
import { Applicant } from "@/hooks/useApplicants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Phone,
  Building2,
  MoreVertical,
  CheckCircle,
  XCircle,
  FileSearch,
  UserPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicantCardProps {
  applicant: Applicant;
  onApprove?: () => void;
  onReject?: () => void;
  onStartScreening?: () => void;
  onConvert?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const statusColors: Record<string, string> = {
  invited: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  started: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  screening: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const statusLabels: Record<string, string> = {
  invited: "Invited",
  started: "In Progress",
  submitted: "Submitted",
  screening: "Screening",
  approved: "Approved",
  rejected: "Rejected",
  converted: "Converted",
  withdrawn: "Withdrawn",
};

export function ApplicantCard({
  applicant,
  onApprove,
  onReject,
  onStartScreening,
  onConvert,
  onDelete,
  onClick,
}: ApplicantCardProps) {
  const displayName = applicant.first_name && applicant.last_name
    ? `${applicant.first_name} ${applicant.last_name}`
    : applicant.email;

  const canApprove = applicant.status === "submitted" || applicant.status === "screening";
  const canReject = applicant.status !== "rejected" && applicant.status !== "converted" && applicant.status !== "withdrawn";
  const canScreen = applicant.status === "submitted";
  const canConvert = applicant.status === "approved";

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg leading-none">{displayName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>
                {applicant.property?.name}
                {applicant.unit?.unit_number && ` - Unit ${applicant.unit.unit_number}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={cn("font-medium", statusColors[applicant.status])}>
              {statusLabels[applicant.status]}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canScreen && onStartScreening && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartScreening(); }}>
                    <FileSearch className="h-4 w-4 mr-2" />
                    Start Screening
                  </DropdownMenuItem>
                )}
                {canApprove && onApprove && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(); }}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Approve
                  </DropdownMenuItem>
                )}
                {canReject && onReject && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReject(); }}>
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    Reject
                  </DropdownMenuItem>
                )}
                {canConvert && onConvert && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConvert(); }}>
                    <UserPlus className="h-4 w-4 mr-2 text-blue-600" />
                    Convert to Tenant
                  </DropdownMenuItem>
                )}
                {(canScreen || canApprove || canReject || canConvert) && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a
              href={`mailto:${applicant.email}`}
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {applicant.email}
            </a>
          </div>

          {applicant.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a
                href={`tel:${applicant.phone}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {applicant.phone}
              </a>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
            <span>
              Invited {format(new Date(applicant.invited_at), "MMM d, yyyy")}
            </span>
            {applicant.application_submitted_at && (
              <span>
                Submitted {format(new Date(applicant.application_submitted_at), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
