
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    console.log('Creating portal configuration...');

    // Create the portal configuration without the deprecated subscription_pause feature
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription and billing details',
      },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true },
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address', 'phone'],
        },
      },
    });

    console.log('Portal configuration created:', configuration.id);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        }
      }
    );

    // Save the configuration ID to the database
    const { error: insertError } = await supabaseClient
      .from('stripe_configurations')
      .insert({
        portal_configuration_id: configuration.id
      });

    if (insertError) {
      console.error('Error saving configuration to database:', insertError);
      throw new Error('Failed to save configuration to database');
    }

    return new Response(
      JSON.stringify({ 
        configurationId: configuration.id,
        message: 'Portal configuration created and saved successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating portal configuration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
