
export interface PaymentSettings {
  id: string;
  property_id: string | null;
  property_name: string;
  late_fee_percentage: number | null;
  grace_period_days: number | null;
  rent_due_day: number;
  payment_methods: string[];
  minimum_payment_percentage: number;
  allow_partial_payments: boolean;
  automatic_late_fees: boolean;
  platform_fee_visible: boolean;
  created_at: string;
  updated_at: string;
}
