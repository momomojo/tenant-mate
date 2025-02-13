
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
      // Use constructEventAsync instead of constructEvent
      event = await stripe.webhooks.constructEventAsync(
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
        
        // Update the company's Stripe account status with new fields
        const { error } = await supabaseClient
          .from('company_stripe_accounts')
          .update({ 
            status: account.details_submitted ? 'completed' : 'pending',
            verification_status: account.charges_enabled && account.payouts_enabled ? 'verified' : 'pending',
            verification_requirements: account.requirements,
            verification_errors: account.requirements?.errors || null,
            last_webhook_received_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stripe_onboarding_data: {
              details_submitted: account.details_submitted,
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              capabilities: account.capabilities,
            },
            onboarding_completed_at: account.details_submitted ? new Date().toISOString() : null,
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Error updating company stripe account:', error);
          throw error;
        }

        // Log the event
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'account.updated',
          p_entity_type: 'stripe_account',
          p_entity_id: account.id,
          p_changes: {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements: account.requirements,
          }
        });

        break;
      }

      case 'account.application.deauthorized': {
        const account = event.data.object as Stripe.Account;
        console.log('Account deauthorized:', account.id);
        
        // Get the property stripe account before updating
        const { data: stripeAccount, error: accountError } = await supabaseClient
          .from('property_stripe_accounts')
          .select('id, property_id')
          .eq('stripe_connect_account_id', account.id)
          .single();

        if (accountError) {
          console.error('Error fetching property stripe account:', accountError);
          throw accountError;
        }

        // Update the property stripe account
        const { error } = await supabaseClient
          .from('property_stripe_accounts')
          .update({ 
            stripe_connect_account_id: null,
            status: 'pending',
            verification_status: 'pending',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Error updating property stripe account:', error);
          throw error;
        }

        // Log the event
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'account.deauthorized',
          p_entity_type: 'stripe_account',
          p_entity_id: stripeAccount.id,
          p_changes: {
            stripe_connect_account_id: null,
            deauthorized_at: new Date().toISOString(),
          }
        });

        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log('Payment method attached:', paymentMethod.id);

        // Get the customer's profile
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', paymentMethod.customer)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        // Insert the payment method
        const { data: paymentMethodData, error: insertError } = await supabaseClient
          .from('payment_methods')
          .insert({
            tenant_id: profile.id,
            stripe_payment_method_id: paymentMethod.id,
            type: paymentMethod.type,
            last_four: paymentMethod.card?.last4 || null,
            is_default: false, // New payment methods are not default by default
            metadata: {
              brand: paymentMethod.card?.brand,
              exp_month: paymentMethod.card?.exp_month,
              exp_year: paymentMethod.card?.exp_year,
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting payment method:', insertError);
          throw insertError;
        }

        // Log the event
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'payment_method.attached',
          p_entity_type: 'payment_method',
          p_entity_id: paymentMethodData.id,
          p_changes: {
            payment_method_id: paymentMethod.id,
            type: paymentMethod.type,
          }
        });

        console.log('Payment method inserted successfully:', paymentMethodData);
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log('Payment method detached:', paymentMethod.id);

        // Get the payment method record
        const { data: existingPaymentMethod, error: fetchError } = await supabaseClient
          .from('payment_methods')
          .select('id, tenant_id')
          .eq('stripe_payment_method_id', paymentMethod.id)
          .single();

        if (fetchError) {
          console.error('Error fetching payment method:', fetchError);
          throw fetchError;
        }

        // Remove the payment method
        const { error: deleteError } = await supabaseClient
          .from('payment_methods')
          .delete()
          .eq('stripe_payment_method_id', paymentMethod.id);

        if (deleteError) {
          console.error('Error deleting payment method:', deleteError);
          throw deleteError;
        }

        // Log the event
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'payment_method.detached',
          p_entity_type: 'payment_method',
          p_entity_id: existingPaymentMethod.id,
          p_changes: {
            payment_method_id: paymentMethod.id,
            detached_at: new Date().toISOString(),
          }
        });

        console.log('Payment method deleted successfully');
        break;
      }

      case 'payment_method.updated': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log('Payment method updated:', paymentMethod.id);

        // Update the payment method
        const { data: updatedPaymentMethod, error: updateError } = await supabaseClient
          .from('payment_methods')
          .update({
            type: paymentMethod.type,
            last_four: paymentMethod.card?.last4 || null,
            metadata: {
              brand: paymentMethod.card?.brand,
              exp_month: paymentMethod.card?.exp_month,
              exp_year: paymentMethod.card?.exp_year,
            }
          })
          .eq('stripe_payment_method_id', paymentMethod.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating payment method:', updateError);
          throw updateError;
        }

        // Log the event
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'payment_method.updated',
          p_entity_type: 'payment_method',
          p_entity_id: updatedPaymentMethod.id,
          p_changes: {
            payment_method_id: paymentMethod.id,
            type: paymentMethod.type,
            updated_at: new Date().toISOString(),
          }
        });

        console.log('Payment method updated successfully:', updatedPaymentMethod);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent succeeded:', paymentIntent.id);

        // Get the transaction and payment records
        const { data: transaction, error: transactionError } = await supabaseClient
          .from('payment_transactions')
          .update({ 
            status: 'succeeded',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .select()
          .single();

        if (transactionError) {
          console.error('Error updating transaction:', transactionError);
          throw transactionError;
        }

        // Update the rent payment status
        const { error: paymentError } = await supabaseClient
          .from('rent_payments')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.rent_payment_id);

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
          throw paymentError;
        }

        // Log the payment event
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'payment_succeeded',
          p_entity_type: 'payment',
          p_entity_id: transaction.rent_payment_id,
          p_changes: {
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount,
            status: 'succeeded'
          }
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent failed:', paymentIntent.id);

        const lastError = paymentIntent.last_payment_error;
        
        // Update transaction and payment status
        const { data: transaction, error: transactionError } = await supabaseClient
          .from('payment_transactions')
          .update({ 
            status: 'failed',
            validation_errors: {
              message: lastError?.message || 'Payment failed',
              code: lastError?.code || 'unknown'
            },
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .select()
          .single();

        if (transactionError) {
          console.error('Error updating transaction:', transactionError);
          throw transactionError;
        }

        // Update the rent payment status
        const { error: paymentError } = await supabaseClient
          .from('rent_payments')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.rent_payment_id);

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
          throw paymentError;
        }

        // Log the payment failure
        await supabaseClient.rpc('log_payment_event', {
          p_event_type: 'payment_failed',
          p_entity_type: 'payment',
          p_entity_id: transaction.rent_payment_id,
          p_changes: {
            payment_intent_id: paymentIntent.id,
            error: lastError || 'Unknown error',
            status: 'failed'
          }
        });

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
