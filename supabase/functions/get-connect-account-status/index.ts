
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id } = await req.json();

    if (!account_id) {
      throw new Error('No account ID provided');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    console.log('Fetching Stripe account status for:', account_id);
    
    const account = await stripe.accounts.retrieve(account_id);
    
    // Get the account link for remediation if there are requirements
    let remediationLink = undefined;
    if (account.requirements?.currently_due?.length > 0 || account.requirements?.eventually_due?.length > 0) {
      const accountLink = await stripe.accountLinks.create({
        account: account_id,
        refresh_url: `${Deno.env.get('SITE_URL')}/settings`,
        return_url: `${Deno.env.get('SITE_URL')}/settings`,
        type: 'account_onboarding',
        collect: 'eventually_due',
      });
      remediationLink = accountLink.url;
    }
    
    console.log('Account status retrieved:', {
      requirements: account.requirements,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      remediationLink: remediationLink ? 'Available' : 'Not needed',
    });

    return new Response(
      JSON.stringify({
        requirements: account.requirements,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        remediationLink,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error retrieving account status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
