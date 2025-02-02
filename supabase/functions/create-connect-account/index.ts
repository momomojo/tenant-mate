import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('No user found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // First, check if the user already has a Connect account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single();

    let accountId = profile?.stripe_connect_account_id;

    // Get the origin and return URL from the request
    const origin = req.headers.get('origin') || '';
    const returnUrl = `${origin}/settings?tab=payments`;

    // If no account exists, create one
    if (!accountId) {
      console.log('Creating new Stripe Connect account...');
      const account = await stripe.accounts.create({
        type: 'standard',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          us_bank_account_ach_payments: { requested: true },
          tax_reporting_us_1099_k: { requested: true }
        },
        business_type: 'company',
        business_profile: {
          mcc: '6513', // Real Estate Agents and Managers
          product_description: 'Property management and rent collection services',
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          }
        },
        metadata: {
          user_id: user.id
        }
      });

      accountId = account.id;
      console.log('Created account:', accountId);

      // Update the user's profile with the Connect account ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
    }

    console.log('Creating account session...');
    // Create an account session for embedded onboarding
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        payments: {
          enabled: true,
        },
      },
    });

    console.log('Account session created successfully');

    // Return both the account session details and OAuth URL with the correct return URL
    return new Response(
      JSON.stringify({
        client_secret: accountSession.client_secret,
        publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
        oauth_url: `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_RhO6GvtqzKJc2vtig3KfKRfGddXbJwWm&scope=read_write&state=${user.id}&redirect_uri=${encodeURIComponent(returnUrl)}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});