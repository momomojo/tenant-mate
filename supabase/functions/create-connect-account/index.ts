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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  try {
    // Get the session or user object
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error(userError?.message || "No user found");
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      throw new Error("No profile found for user");
    }

    console.log('Creating Stripe Connect account for user:', user.id);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // First, create a Connect account if one doesn't exist
    let accountId = profile.stripe_connect_account_id;
    
    if (!accountId) {
      console.log('No existing Connect account found, creating new one...');
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          }
        }
      });

      console.log('Created new Connect account:', account.id);
      accountId = account.id;

      // Update the user's profile with their Connect account ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_connect_account_id: account.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
    }

    // Create an account session for the embedded onboarding
    console.log('Creating account session for account:', accountId);
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          payouts_enabled: true,
        },
        payments: {
          enabled: true,
        }
      }
    });

    console.log('Created account session:', accountSession.id);

    return new Response(
      JSON.stringify({
        client_secret: accountSession.client_secret,
        publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY')
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-connect-account:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});