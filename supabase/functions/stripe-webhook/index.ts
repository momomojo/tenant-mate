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
    console.log('Received webhook body:', body);

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

    console.log('Processing event type:', event.type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        const paymentId = session.metadata?.payment_id;

        if (paymentId) {
          // Update rent_payments status
          await supabaseClient
            .from('rent_payments')
            .update({ 
              status: 'paid',
              payment_method: session.payment_method_types?.[0] || 'card'
            })
            .eq('id', paymentId);

          // Update payment_transactions status
          await supabaseClient
            .from('payment_transactions')
            .update({ 
              status: 'completed',
              stripe_payment_intent_id: session.payment_intent,
              payment_method: session.payment_method_types?.[0] || 'card'
            })
            .eq('rent_payment_id', paymentId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata?.session_id);
        const paymentId = session.metadata?.payment_id;

        if (paymentId) {
          // Update rent_payments status
          await supabaseClient
            .from('rent_payments')
            .update({ status: 'failed' })
            .eq('id', paymentId);

          // Update payment_transactions status
          await supabaseClient
            .from('payment_transactions')
            .update({ 
              status: 'failed',
              stripe_payment_intent_id: paymentIntent.id
            })
            .eq('rent_payment_id', paymentId);
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Stripe account updated:', account.id);
        
        // Update the profile's Stripe account status
        await supabaseClient
          .from('profiles')
          .update({ 
            stripe_connect_account_id: account.id,
          })
          .eq('stripe_connect_account_id', account.id);
        break;
      }

      case 'account.application.deauthorized': {
        const account = event.data.object as Stripe.Account;
        console.log('Stripe account deauthorized:', account.id);
        
        // Remove the Stripe account ID from the profile
        await supabaseClient
          .from('profiles')
          .update({ 
            stripe_connect_account_id: null 
          })
          .eq('stripe_connect_account_id', account.id);
        break;
      }

      case 'capability.updated': {
        const capability = event.data.object as Stripe.Capability;
        console.log('Capability updated:', capability.account, capability.id, capability.status);
        break;
      }

      case 'account.external_account.created': {
        const externalAccount = event.data.object as Stripe.BankAccount | Stripe.Card;
        console.log('External account created:', externalAccount.account);
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
