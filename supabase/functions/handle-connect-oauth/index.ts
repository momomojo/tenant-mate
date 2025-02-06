
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
    const { code, state, property_id } = await req.json();

    if (!code || !state) {
      throw new Error('Missing required parameters');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Exchange the authorization code for an account
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const connectedAccountId = response.stripe_user_id;
    if (!connectedAccountId) {
      throw new Error('No connected account ID received');
    }

    // Get the connected account details
    const account = await stripe.accounts.retrieve(connectedAccountId, {
      expand: ['capabilities', 'requirements']
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Update the property_stripe_accounts table
    const { error: updateError } = await supabaseClient
      .from('property_stripe_accounts')
      .update({ 
        stripe_connect_account_id: connectedAccountId,
        status: account.details_submitted ? 'completed' : 'pending',
        verification_status: account.details_submitted ? 'verified' : 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('property_manager_id', state)
      .eq('is_active', true);

    if (updateError) {
      throw updateError;
    }

    // Only return non-sensitive information
    return new Response(
      JSON.stringify({
        accountId: connectedAccountId,
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
