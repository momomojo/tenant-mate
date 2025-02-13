
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
    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get payment details from the payment_history_view
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payment_history_view')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    // Verify the user has access to this payment
    if (payment.tenant_id !== user.id) {
      const { data: propertyManager } = await supabaseClient
        .from('properties')
        .select('property_manager_id')
        .eq('id', payment.property_id)
        .single();

      if (!propertyManager || propertyManager.property_manager_id !== user.id) {
        throw new Error('Unauthorized');
      }
    }

    // Generate receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Payment Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .receipt {
              border: 1px solid #ddd;
              padding: 20px;
              margin-top: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .details {
              margin-bottom: 20px;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Receipt #: ${payment.invoice_number}</p>
            </div>
            <div class="details">
              <p><strong>Property:</strong> ${payment.property_name}</p>
              <p><strong>Unit:</strong> ${payment.unit_number}</p>
              <p><strong>Date:</strong> ${new Date(payment.payment_date).toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> ${payment.payment_method || 'N/A'}</p>
            </div>
            <div class="amount">
              Amount Paid: $${payment.amount}
            </div>
            <hr>
            <div style="text-align: center; margin-top: 20px;">
              <p>Thank you for your payment!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create a new receipt record
    const { data: receipt, error: receiptError } = await supabaseClient
      .from('payment_receipts')
      .insert({
        payment_id: paymentId,
        receipt_number: `RCP-${payment.invoice_number}`,
        receipt_url: null // We'll update this with actual storage URL in a future iteration
      })
      .select()
      .single();

    if (receiptError) {
      throw receiptError;
    }

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
