import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('paymentId');

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

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

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from('rent_payments')
      .select(`
        *,
        unit:units(
          unit_number,
          property:properties(
            name,
            address
          )
        ),
        tenant:profiles(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;
    if (!payment) throw new Error('Payment not found');

    // Generate receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .receipt { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .amount { font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Receipt ID: ${payment.id}</p>
            </div>
            <div class="details">
              <p><strong>Property:</strong> ${payment.unit.property.name}</p>
              <p><strong>Unit:</strong> ${payment.unit.unit_number}</p>
              <p><strong>Date:</strong> ${new Date(payment.payment_date).toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> ${payment.payment_method || 'N/A'}</p>
              <p><strong>Status:</strong> ${payment.status}</p>
              <p class="amount">Amount Paid: $${payment.amount}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return new Response(
      receiptHtml,
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error generating receipt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});