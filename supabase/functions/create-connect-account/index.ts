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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the user from the auth context
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Verifying user authentication...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication failed');
    }

    console.log('Fetching user profile...');
    // Get user profile to pre-fill information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    let userProfile = profile;

    if (!userProfile) {
      console.log('No profile found, creating new profile...');
      const { data: newProfile, error: createError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: 'property_manager'
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        throw new Error('Failed to create profile');
      }

      console.log('Created new profile for user');
      userProfile = newProfile;
    }

    if (userProfile.stripe_connect_account_id) {
      console.log('User already has a Stripe Connect account');
      throw new Error('Stripe Connect account already exists');
    }

    console.log('Creating Stripe Connect account...');
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create a Stripe Connect account with pre-filled information
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: userProfile.email,
      business_type: 'individual',
      individual: {
        email: userProfile.email,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    console.log('Stripe account created:', account.id);

    // Update profile with the new account ID
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ stripe_connect_account_id: account.id })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update profile with Stripe account ID');
    }

    // Get the origin and return URL from the request
    const origin = req.headers.get('origin') || '';
    const returnUrl = `${origin}/settings`;

    console.log('Creating account link...');
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${returnUrl}?refresh=true`,
      return_url: returnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    console.log('Account link created successfully');

    return new Response(
      JSON.stringify({ url: accountLink.url }),
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