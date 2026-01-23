import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  trend: string;
  trendUp: boolean;
  index?: number;
}

const gradients = [
  "from-brand-indigo/20 to-brand-indigo/5",
  "from-brand-purple/20 to-brand-purple/5",
  "from-status-success/20 to-status-success/5",
  "from-brand-blue/20 to-brand-blue/5",
  "from-status-warning/20 to-status-warning/5",
  "from-pink-500/20 to-pink-500/5",
];

const iconColors = [
  "text-brand-indigo-light",
  "text-brand-purple-light",
  "text-status-success",
  "text-brand-blue",
  "text-status-warning",
  "text-pink-400",
];

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
  index = 0,
}: StatCardProps) => {
  const colorIndex = index % gradients.length;
  const gradient = gradients[colorIndex];
  const iconColor = iconColors[colorIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 card-hover-lift">
        {/* Gradient background accent */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider line-clamp-1">
              {title}
            </p>
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] group-hover:border-white/[0.12] transition-colors duration-300">
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight line-clamp-1 mb-1">
            {value}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                trendUp
                  ? "text-status-success bg-status-success/10"
                  : "text-status-error bg-status-error/10"
              }`}
            >
              {trend}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
