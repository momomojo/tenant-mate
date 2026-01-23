// Updated January 2026 - Security hardened
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'
import { escapeHtml, safeErrorResponse } from '../_shared/security.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  const preflightResponse = handleCorsPreflightOrRestrict(req)
  if (preflightResponse) return preflightResponse

  try {
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('paymentId')

    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get payment details with related information
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
      .single()

    if (paymentError) throw paymentError
    if (!payment) throw new Error('Payment not found')

    // Format the payment date
    const paymentDate = new Date(payment.payment_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate receipt HTML with improved styling
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .receipt {
              border: 1px solid #ddd;
              padding: 30px;
              border-radius: 8px;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #eee;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .receipt-id {
              color: #666;
              font-size: 14px;
            }
            .details {
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: #1f2937;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              text-align: center;
              padding: 20px;
              background: #f8fafc;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              font-size: 14px;
              color: #666;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo">${escapeHtml(payment.unit.property.name)}</div>
              <div class="receipt-id">Receipt #${escapeHtml(String(payment.invoice_number))}</div>
            </div>

            <div class="details">
              <div class="section">
                <div class="section-title">Property Details</div>
                <p>${escapeHtml(payment.unit.property.address)}</p>
                <p>Unit ${escapeHtml(payment.unit.unit_number)}</p>
              </div>

              <div class="section">
                <div class="section-title">Tenant Information</div>
                <p>${escapeHtml(payment.tenant.first_name)} ${escapeHtml(payment.tenant.last_name)}</p>
                <p>${escapeHtml(payment.tenant.email)}</p>
              </div>

              <div class="section">
                <div class="section-title">Payment Details</div>
                <p>Date: ${escapeHtml(paymentDate)}</p>
                <p>Payment Method: ${escapeHtml(payment.payment_method || 'N/A')}</p>
                <p>Status: ${escapeHtml(payment.status)}</p>
              </div>

              <div class="amount">
                Amount Paid: $${Number(payment.amount).toFixed(2)}
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your payment!</p>
              <p>This is an automatically generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return new Response(
      receiptHtml,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      }
    )
  } catch (error) {
    return safeErrorResponse(error, corsHeaders)
  }
})
