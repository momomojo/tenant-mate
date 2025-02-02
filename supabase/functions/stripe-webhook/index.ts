import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Webhook received:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found');
      return new Response('No signature', { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const body = await req.text();
    console.log('Webhook body:', body);

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      console.log('Event constructed successfully:', event.type);
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    console.log('Processing event type:', event.type);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);
        console.log('Account details:', {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements,
        });
        
        // Update the profile's Stripe account status
        const { data, error } = await supabaseClient
          .from('profiles')
          .update({ 
            stripe_connect_account_id: account.id,
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }

        console.log('Profile updated successfully:', data);
        break;
      }

      case 'account.application.deauthorized': {
        const account = event.data.object as Stripe.Account;
        console.log('Account deauthorized:', account.id);
        
        // Remove the Stripe account ID from the profile
        const { data, error } = await supabaseClient
          .from('profiles')
          .update({ 
            stripe_connect_account_id: null 
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }

        console.log('Profile updated successfully:', data);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});