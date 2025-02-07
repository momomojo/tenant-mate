
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentSettings } from '@/types/payment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function PaymentSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings_view')
        .select('*');

      if (error) {
        toast.error('Failed to load payment settings');
        throw error;
      }

      return data as PaymentSettings[];
    }
  });

  const updateSettings = async (propertyId: string, updates: Partial<PaymentSettings>) => {
    try {
      const { error } = await supabase
        .from('payment_configs')
        .update(updates)
        .eq('property_id', propertyId);

      if (error) throw error;
      toast.success('Payment settings updated successfully');
    } catch (error) {
      console.error('Error updating payment settings:', error);
      toast.error('Failed to update payment settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {settings?.map((setting) => (
        <Card key={setting.id}>
          <CardHeader>
            <CardTitle>Payment Settings - {setting.property_name}</CardTitle>
            <CardDescription>
              Configure payment rules and settings for this property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor={`rent-due-day-${setting.id}`}>Rent Due Day</Label>
                <Input
                  id={`rent-due-day-${setting.id}`}
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={setting.rent_due_day}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 31) {
                      updateSettings(setting.property_id!, { rent_due_day: value });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`late-fee-${setting.id}`}>Late Fee Percentage</Label>
                <Input
                  id={`late-fee-${setting.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={setting.late_fee_percentage || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value >= 0) {
                      updateSettings(setting.property_id!, { late_fee_percentage: value });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`grace-period-${setting.id}`}>Grace Period (Days)</Label>
                <Input
                  id={`grace-period-${setting.id}`}
                  type="number"
                  min="0"
                  defaultValue={setting.grace_period_days || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 0) {
                      updateSettings(setting.property_id!, { grace_period_days: value });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`min-payment-${setting.id}`}>Minimum Payment Percentage</Label>
                <Input
                  id={`min-payment-${setting.id}`}
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={setting.minimum_payment_percentage}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value >= 0 && value <= 100) {
                      updateSettings(setting.property_id!, { minimum_payment_percentage: value });
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`partial-payments-${setting.id}`}>Allow Partial Payments</Label>
                <Switch
                  id={`partial-payments-${setting.id}`}
                  checked={setting.allow_partial_payments}
                  onCheckedChange={(checked) => {
                    updateSettings(setting.property_id!, { allow_partial_payments: checked });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor={`auto-late-fees-${setting.id}`}>Automatic Late Fees</Label>
                <Switch
                  id={`auto-late-fees-${setting.id}`}
                  checked={setting.automatic_late_fees}
                  onCheckedChange={(checked) => {
                    updateSettings(setting.property_id!, { automatic_late_fees: checked });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor={`platform-fee-${setting.id}`}>Show Platform Fees</Label>
                <Switch
                  id={`platform-fee-${setting.id}`}
                  checked={setting.platform_fee_visible}
                  onCheckedChange={(checked) => {
                    updateSettings(setting.property_id!, { platform_fee_visible: checked });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
