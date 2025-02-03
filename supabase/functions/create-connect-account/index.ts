import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_DATA = {
  dates: {
    successfulVerification: '1901-01-01',
    immediateVerification: '1902-01-01',
    ofacAlert: '1900-01-01',
  },
  addresses: {
    fullMatch: 'address_full_match',
    noMatch: 'address_no_match',
    line1NoMatch: 'address_line1_no_match',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-connect-account function');
    
    const { onboardingData } = await req.json();
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

    let userProfile = profile;

    if (!userProfile) {
      console.log('No profile found, creating new profile...');
      try {
        const { data: newProfile, error: createError } = await supabaseClient
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            first_name: onboardingData?.firstName || user.user_metadata?.first_name || '',
            last_name: onboardingData?.lastName || user.user_metadata?.last_name || '',
            role: 'property_manager'
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw new Error(`Failed to create profile: ${createError.message}`);
        }

        userProfile = newProfile;
      } catch (error) {
        console.error('Detailed profile creation error:', error);
        throw new Error('Failed to create profile');
      }
    }

    if (userProfile.stripe_connect_account_id) {
      console.log('User already has a Stripe Connect account:', userProfile.stripe_connect_account_id);
      throw new Error('Stripe Connect account already exists');
    }

    console.log('Creating Stripe Connect account...');
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Handle test mode data
    if (isTestMode) {
      console.log('Using test mode data');
      if (onboardingData.dateOfBirth === TEST_DATA.dates.ofacAlert) {
        throw new Error('OFAC Alert triggered (test mode)');
      }
      
      if (onboardingData.addressLine1 === TEST_DATA.addresses.noMatch) {
        console.log('Using test address that will fail verification');
      }
    }

    const [year, month, day] = onboardingData.dateOfBirth.split('-').map(Number);

    // Get client IP from various possible headers
    const clientIp = req.headers.get('x-forwarded-for') || 
                    req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1'; // Fallback to localhost if no IP found

    console.log('Client IP for TOS acceptance:', clientIp);

    const accountParams = {
      type: 'express',
      country: 'US',
      email: onboardingData.email || userProfile.email,
      business_type: 'individual',
      individual: {
        email: onboardingData.email || userProfile.email,
        first_name: onboardingData.firstName || userProfile.first_name,
        last_name: onboardingData.lastName || userProfile.last_name,
        phone: onboardingData.phone,
        address: {
          line1: onboardingData.addressLine1,
          city: onboardingData.city,
          state: onboardingData.state,
          postal_code: onboardingData.postalCode,
        },
        dob: {
          day,
          month,
          year,
        },
        ssn_last_4: onboardingData.ssnLast4,
      },
      business_profile: {
        mcc: '6513', // Real Estate
        product_description: 'Property rental payments',
        url: 'https://example.com',
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payments: {
          statement_descriptor: onboardingData.statementDescriptor,
        },
        payouts: {
          schedule: {
            interval: 'manual'
          }
        }
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: clientIp,
      },
    };

    // Create account with retry logic
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

    // Update profile with the new account ID and onboarding data
    try {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          stripe_connect_account_id: account.id,
          stripe_onboarding_data: onboardingData,
          onboarding_status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        // Try to delete the Stripe account if profile update fails
        try {
          await stripe.accounts.del(account.id);
        } catch (deleteError) {
          console.error('Failed to delete Stripe account after profile update failure:', deleteError);
        }
        throw new Error('Failed to update profile with Stripe account ID');
      }
    } catch (error) {
      console.error('Detailed profile update error:', error);
      throw new Error('Failed to update profile');
    }

    const origin = req.headers.get('origin') || '';
    const returnUrl = `${origin}/settings`;

    console.log('Creating account link...');
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${returnUrl}?refresh=true`,
      return_url: returnUrl,
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
        status: 500,
      }
    );
  }
});