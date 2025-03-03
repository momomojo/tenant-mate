
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AutoPayToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function AutoPayToggle({ enabled, onToggle, disabled }: AutoPayToggleProps) {
  return (
    <Alert>
      <AlertDescription>
        Automatic payments have been disabled as Stripe integration has been removed.
      </AlertDescription>
    </Alert>
  );
}
