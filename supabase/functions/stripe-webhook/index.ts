import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const paymentId = session.metadata?.payment_id;

        if (paymentId) {
          // Update rent_payments status
          await supabaseClient
            .from('rent_payments')
            .update({ status: 'paid' })
            .eq('id', paymentId);

          // Update payment_transactions status
          await supabaseClient
            .from('payment_transactions')
            .update({ 
              status: 'completed',
              stripe_payment_intent_id: session.payment_intent
            })
            .eq('rent_payment_id', paymentId);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
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
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});