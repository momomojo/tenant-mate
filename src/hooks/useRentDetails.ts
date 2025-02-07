
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface RentDetails {
  monthlyRent: number | null;
  stripeConnectError: string | null;
}

export function useRentDetails(unitId: string, user: User | null) {
  const [rentDetails, setRentDetails] = useState<RentDetails>({
    monthlyRent: null,
    stripeConnectError: null,
  });

  useEffect(() => {
    if (user?.id) {
      fetchRentDetails();
    }
  }, [user, unitId]);

  const fetchRentDetails = async () => {
    try {
      // Get the property_manager_assignments view to get all the necessary information
      const { data: assignment, error: assignmentError } = await supabase
        .from('property_manager_assignments')
        .select('*')
        .eq('unit_id', unitId)
        .eq('tenant_id', user!.id)
        .maybeSingle();

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError);
        setRentDetails(prev => ({
          ...prev,
          stripeConnectError: "Error fetching payment information. Please try again later."
        }));
        return;
      }

      if (!assignment) {
        console.error('No assignment found for this unit and tenant');
        setRentDetails(prev => ({
          ...prev,
          stripeConnectError: "You don't have permission to make payments for this unit."
        }));
        return;
      }

      // Check if company has Stripe Connect set up
      const { data: stripeAccount, error: stripeError } = await supabase
        .from('company_stripe_accounts')
        .select('*')
        .single();

      if (stripeError || !stripeAccount) {
        setRentDetails(prev => ({
          ...prev,
          stripeConnectError: "Your property manager hasn't set up payments yet. Please contact them to enable online payments."
        }));
        return;
      }

      // Get the monthly rent from the units table
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('monthly_rent')
        .eq('id', unitId)
        .maybeSingle();

      if (unitError) {
        console.error('Error fetching unit:', unitError);
        setRentDetails(prev => ({
          ...prev,
          stripeConnectError: "Error fetching rent amount. Please try again later."
        }));
        return;
      }

      if (!unit) {
        console.error('No unit found');
        setRentDetails(prev => ({
          ...prev,
          stripeConnectError: "Unit information not found."
        }));
        return;
      }

      setRentDetails({
        monthlyRent: unit.monthly_rent,
        stripeConnectError: null
      });
    } catch (error) {
      console.error('Error fetching rent details:', error);
      setRentDetails(prev => ({
        ...prev,
        stripeConnectError: "Error fetching rent details. Please try again later."
      }));
    }
  };

  return rentDetails;
}
