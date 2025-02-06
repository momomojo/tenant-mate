
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Log function invocation
  console.log('Portal session function invoked');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Parse request body with error handling
    let return_url;
    try {
      const body = await req.json();
      return_url = body.return_url;
      console.log('Received return_url:', return_url);
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    if (!return_url) {
      throw new Error('Return URL is required');
    }

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('Authenticated user:', user.email);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get or create customer
    let customerId;
    const { data: customers } = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.length > 0) {
      customerId = customers[0].id;
      console.log('Found existing customer:', customerId);
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          tenant_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('Created new customer:', customerId);
    }

    // Get the portal configuration ID from the database
    const { data: configs, error: configError } = await supabaseClient
      .from('stripe_configurations')
      .select('portal_configuration_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError) {
      console.error('Error fetching portal configuration:', configError);
      throw new Error('Failed to fetch portal configuration');
    }

    console.log('Using portal configuration:', configs.portal_configuration_id);

    // Create portal session config
    const portalConfig = {
      customer: customerId,
      return_url: return_url,
      configuration: configs.portal_configuration_id
    };

    console.log('Creating portal session with config:', portalConfig);

    // Create a portal session
    const { url } = await stripe.billingPortal.sessions.create(portalConfig);

    console.log('Portal session created with URL:', url);

    return new Response(
      JSON.stringify({ url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
