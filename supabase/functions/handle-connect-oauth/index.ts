
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();

    if (!code || !state) {
      throw new Error('Missing required parameters');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get the connected account details
    const account = await stripe.accounts.retrieve(state, {
      expand: ['capabilities', 'requirements']
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Update the company_stripe_accounts table
    const { error: updateError } = await supabaseClient
      .from('company_stripe_accounts')
      .update({ 
        status: account.details_submitted ? 'completed' : 'pending',
        verification_status: account.details_submitted ? 'verified' : 'pending',
        verification_requirements: account.requirements,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_connect_account_id', account.id);

    if (updateError) {
      throw updateError;
    }

    // Only return non-sensitive information
    return new Response(
      JSON.stringify({
        accountId: account.id,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          pending_verification: account.requirements?.pending_verification || [],
        },
        capabilities: account.capabilities,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error handling OAuth return:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
