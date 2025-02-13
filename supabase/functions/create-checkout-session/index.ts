
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Checkout session function invoked with method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const text = await req.text();
    console.log('Raw request body text:', text);
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, unit_id, setup_future_payments } = JSON.parse(text);
    console.log('Received request with:', { amount, unit_id, setup_future_payments });

    // Create a Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User verification error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('User verified:', user.id);

    // Get the property manager's Stripe account and validate status
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('property_manager_assignments')
      .select(`
        stripe_connect_account_id,
        property_manager_id,
        property_id
      `)
      .eq('unit_id', unit_id)
      .eq('tenant_id', user.id)
      .single();

    if (assignmentError || !assignment) {
      console.error('Error fetching assignment:', assignmentError);
      throw new Error('Failed to fetch payment details');
    }

    // Get and validate Stripe account status
    const { data: stripeAccount, error: stripeAccountError } = await supabaseAdmin
      .from('property_stripe_accounts')
      .select('*')
      .eq('property_id', assignment.property_id)
      .eq('property_manager_id', assignment.property_manager_id)
      .eq('is_active', true)
      .single();

    if (stripeAccountError || !stripeAccount) {
      console.error('Error fetching Stripe account:', stripeAccountError);
      throw new Error('Property manager has not completed Stripe setup');
    }

    if (stripeAccount.status !== 'completed' || stripeAccount.verification_status !== 'verified') {
      console.error('Invalid Stripe account status:', {
        status: stripeAccount.status,
        verification_status: stripeAccount.verification_status
      });
      throw new Error('Property manager\'s Stripe account is not fully verified');
    }

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

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
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
      console.error('Payment creation error:', paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    console.log('Payment record created:', payment.id);

    // Calculate application fee (platform fee)
    const platformFeePercentage = 0.05; // 5% platform fee
    const applicationFee = Math.round(amount * platformFeePercentage * 100); // Convert to cents

    // Create payment transaction record with validation
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        rent_payment_id: payment.id,
        amount,
        property_manager_id: assignment.property_manager_id,
        property_stripe_account_id: stripeAccount.id,
        stripe_customer_id: customerId,
        validation_status: 'pending',
        routing_attempts: 0
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error(`Failed to create transaction record: ${transactionError.message}`);
    }

    // Create Stripe checkout session
    console.log('Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Rent Payment',
              description: `Rent payment for unit ${unit_id}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payments?success=true`,
      cancel_url: `${req.headers.get('origin')}/payments?canceled=true`,
      metadata: {
        payment_id: payment.id,
        transaction_id: transaction.id,
        tenant_id: user.id,
        unit_id,
      },
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: stripeAccount.stripe_connect_account_id,
        },
      },
    });

    console.log('Checkout session created:', session.id);

    // Update transaction with payment intent
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        payment_id: payment.id,
        transaction_id: transaction.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in checkout session creation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
