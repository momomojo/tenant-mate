import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  trend: string;
  trendUp: boolean;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
}: StatCardProps) => {
  return (
    <Card className="bg-[#403E43] border-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-200 line-clamp-1">
          {title}
        </CardTitle>
        <div className="rounded-full bg-[#1A1F2C]/50 p-2 shrink-0">
          <Icon className="h-4 w-4 text-[#9b87f5]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl font-bold text-white line-clamp-1">{value}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">{description}</p>
          <span
            className={`text-xs ${
              trendUp ? "text-green-400" : "text-red-400"
            } whitespace-nowrap`}
          >
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};