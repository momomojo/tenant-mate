import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export function PaymentAlerts() {
  const { data: activeLeases } = useQuery({
    queryKey: ["active-leases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("tenant_units")
        .select(`
          unit_id,
          unit:units (
            unit_number,
            monthly_rent,
            property_id
          )
        `)
        .eq("tenant_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const { data: lateFees } = useQuery({
    queryKey: ["late-fees", activeLeases],
    enabled: !!activeLeases?.length,
    queryFn: async () => {
      if (!activeLeases) return [];

      const feesPromises = activeLeases.map(async (lease) => {
        const { data, error } = await supabase.rpc('calculate_late_fee', {
          payment_amount: lease.unit.monthly_rent,
          due_date: new Date().toISOString(),
          property_id: lease.unit.property_id
        });

        if (error) throw error;
        return {
          unitNumber: lease.unit.unit_number,
          lateFee: data
        };
      });

      return Promise.all(feesPromises);
    },
  });

  const hasLateFees = lateFees?.some(fee => fee.lateFee > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="space-y-4"
    >
      {hasLateFees && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-status-error/10 border border-status-error/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-status-error/20">
            <AlertTriangle className="h-4 w-4 text-status-error" />
          </div>
          <p className="text-sm text-status-error font-medium">
            You have pending late fees. Please check your payment status.
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-indigo-light" />
            <h3 className="text-sm font-semibold text-white">Payment Alerts</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {lateFees?.map((fee, index) => (
            fee.lateFee > 0 && (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-status-warning/10">
                    <CalendarClock className="h-4 w-4 text-status-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Unit {fee.unitNumber}</p>
                    <p className="text-xs text-muted-foreground">Late Fee: ${fee.lateFee}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-status-warning bg-status-warning/10 px-2 py-1 rounded-full">
                  <DollarSign className="h-3 w-3" />
                  <span>{fee.lateFee}</span>
                </div>
              </div>
            )
          ))}
          {!hasLateFees && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-status-success/10 mb-3">
                <DollarSign className="h-5 w-5 text-status-success" />
              </div>
              <p className="text-sm text-muted-foreground">No pending late fees</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
