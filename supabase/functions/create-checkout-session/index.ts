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
    const { amount, unit_id, setup_future_payments } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create a new payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('rent_payments')
      .insert({
        tenant_id: user.id,
        unit_id,
        amount,
        status: 'pending',
        payment_method: 'card'
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Create payment transaction record
    const { error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        rent_payment_id: payment.id,
        amount,
        status: 'pending',
        payment_method: 'card'
      });

    if (transactionError) {
      throw transactionError;
    }

    // Get or create customer
    let customerId;
    const { data: customers } = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.length > 0) {
      customerId = customers[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          tenant_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Rent Payment',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      ...(setup_future_payments && {
        setup_future_usage: 'off_session',
      }),
      success_url: `${req.headers.get('origin')}/payments?success=true`,
      cancel_url: `${req.headers.get('origin')}/payments?canceled=true`,
      metadata: {
        payment_id: payment.id,
        tenant_id: user.id,
        unit_id,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});