
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Starting create-connect-account function');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    const isTestMode = Deno.env.get('NODE_ENV') !== 'production';
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Verifying user authentication...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication failed');
    }

    console.log('Fetching user profile...');
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // Check if a company Stripe account already exists
    const { data: existingAccount, error: accountError } = await supabaseClient
      .from('company_stripe_accounts')
      .select('*')
      .single();

    if (existingAccount?.stripe_connect_account_id) {
      console.log('Company already has a Stripe Connect account:', existingAccount.stripe_connect_account_id);
      throw new Error('Company already has a Stripe Connect account');
    }

    // Get client IP and validate format
    let clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                  req.headers.get('cf-connecting-ip') || 
                  req.headers.get('x-real-ip');

    // Validate IP format (basic IPv4 validation)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!clientIp || !ipv4Regex.test(clientIp)) {
      clientIp = '98.51.100.1';
    }

    const origin = req.headers.get('origin') || 'https://app.example.com';

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create Stripe Custom account with minimal requirements for test mode
    const accountParams = {
      type: 'custom',
      country: 'US',
      email: profile.email,
      business_type: 'company',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: clientIp,
      },
      business_profile: {
        mcc: '6513', // Real Estate
        product_description: 'Property rental payments',
        url: origin,
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual'
          }
        }
      }
    };

    let account;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        account = await stripe.accounts.create(accountParams);
        break;
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    console.log('Stripe account created:', account.id);

    // Create company_stripe_accounts record
    const { error: insertError } = await supabaseClient
      .from('company_stripe_accounts')
      .insert({
        stripe_connect_account_id: account.id,
        status: 'pending',
        verification_status: 'pending',
      });

    if (insertError) {
      console.error('Error creating company stripe account record:', insertError);
      try {
        await stripe.accounts.del(account.id);
      } catch (deleteError) {
        console.error('Failed to delete Stripe account after record creation failure:', deleteError);
      }
      throw new Error('Failed to create company stripe account record');
    }

    // Create account link for collecting required information
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/settings?refresh=true`,
      return_url: `${origin}/settings?setup=complete`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    console.log('Account link created successfully');

    return new Response(
      JSON.stringify({ 
        oauth_url: accountLink.url,
        account_id: account.id 
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
