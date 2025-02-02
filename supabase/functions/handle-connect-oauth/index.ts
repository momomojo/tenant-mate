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
    console.log('Received OAuth return with code:', code, 'and state:', state);

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Exchange the authorization code for an access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    console.log('OAuth token exchange response:', response);

    const connectedAccountId = response.stripe_user_id;
    if (!connectedAccountId) {
      throw new Error('No connected account ID received');
    }

    // Get the connected account details
    const account = await stripe.accounts.retrieve(connectedAccountId);
    console.log('Retrieved account details:', account);

    // Update the user's profile with the connected account ID
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        stripe_connect_account_id: connectedAccountId,
      })
      .eq('id', state);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    // Return the account status and requirements
    return new Response(
      JSON.stringify({
        accountId: connectedAccountId,
        requirements: account.requirements,
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