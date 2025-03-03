
import { useState } from 'react';
import { toast } from 'sonner';

export function useAutoPayment(unitId: string, userId?: string) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleAutoPay = async () => {
    setIsLoading(true);
    try {
      toast.info("Automatic payments are not available without Stripe integration");
    } catch (error) {
      console.error('Error toggling autopay:', error);
      toast.error('Failed to toggle automatic payments');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEnabled,
    isLoading,
    toggleAutoPay
  };
}
