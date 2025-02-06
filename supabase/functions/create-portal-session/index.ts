
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Portal session function invoked');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Parse request body with detailed error logging
    let requestBody;
    try {
      const contentType = req.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      const rawBody = await req.text();
      console.log('Raw request body:', rawBody);
      
      try {
        requestBody = JSON.parse(rawBody);
        console.log('Parsed request body:', requestBody);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid JSON format',
            details: parseError.message 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (bodyError) {
      console.error('Error reading request body:', bodyError);
      return new Response(
        JSON.stringify({ 
          error: 'Error reading request body',
          details: bodyError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate return_url
    const { return_url } = requestBody;
    if (!return_url) {
      console.error('Missing return_url in request body');
      return new Response(
        JSON.stringify({ 
          error: 'return_url is required',
          receivedBody: requestBody 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      new URL(return_url);
    } catch (urlError) {
      console.error('Invalid return_url format:', urlError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid return_url format',
          details: urlError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: userError?.message 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Authenticated user:', user.email);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get or create customer with retry logic
    let customerId;
    let retries = 3;
    while (retries > 0) {
      try {
        const { data: customers } = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (customers.length > 0) {
          customerId = customers[0].id;
          console.log('Found existing customer:', customerId);
          break;
        } else {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              tenant_id: user.id,
            },
          });
          customerId = customer.id;
          console.log('Created new customer:', customerId);
          break;
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('All retries failed for customer operation:', error);
          throw error;
        }
        console.log(`Retry attempt ${3 - retries} for customer operation`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Get portal configuration
    try {
      const { data: configs, error: configError } = await supabaseClient
        .from('stripe_configurations')
        .select('portal_configuration_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError) {
        console.error('Error fetching portal configuration:', configError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch portal configuration',
            details: configError.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!configs?.portal_configuration_id) {
        console.error('No portal configuration found');
        return new Response(
          JSON.stringify({ error: 'Portal configuration not found' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('Using portal configuration:', configs.portal_configuration_id);

      // Create portal session
      const { url } = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: return_url,
        configuration: configs.portal_configuration_id
      });

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
        JSON.stringify({ 
          error: 'Failed to create portal session',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
