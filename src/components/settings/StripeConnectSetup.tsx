
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const StripeConnectSetup = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Processing Setup</CardTitle>
        <CardDescription>
          Stripe integration has been removed from this application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          The Stripe payment processing integration has been removed from this application.
          Please contact your property manager for alternative payment methods.
        </p>
      </CardContent>
    </Card>
  );
};
