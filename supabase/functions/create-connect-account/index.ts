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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User verification error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('User verified:', user.id);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    let account;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (profile?.stripe_connect_account_id) {
      console.log('Found existing Connect account:', profile.stripe_connect_account_id);
      account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    } else {
      console.log('Creating new Connect account...');
      account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
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

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_connect_account_id: account.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error saving Connect account ID:', updateError);
        throw new Error('Failed to save Connect account ID');
      }
    }

    console.log('Creating account session...');
    const accountSession = await stripe.accountSessions.create({
      account: account.id,
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
        status: 400,
      }
    );
  }
});