// Updated January 2026 - Using current Supabase Edge Functions patterns
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  type: 'maintenance_created' | 'maintenance_status_changed' | 'payment_received' | 'tenant_assigned'
  recipientEmail: string
  recipientName: string
  data: Record<string, unknown>
}

const emailTemplates = {
  maintenance_created: (data: Record<string, unknown>) => ({
    subject: `New Maintenance Request: ${data.title}`,
    html: `
      <h2>New Maintenance Request Submitted</h2>
      <p>A new maintenance request has been submitted for your property.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Priority:</strong> ${data.priority}</p>
        <p><strong>Property:</strong> ${data.propertyName}</p>
        <p><strong>Unit:</strong> ${data.unitNumber}</p>
        <p><strong>Submitted by:</strong> ${data.tenantName}</p>
      </div>
      <p>Please log in to your dashboard to review and respond to this request.</p>
    `,
  }),

  maintenance_status_changed: (data: Record<string, unknown>) => ({
    subject: `Maintenance Request Update: ${data.title}`,
    html: `
      <h2>Maintenance Request Status Updated</h2>
      <p>Your maintenance request status has been updated.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>New Status:</strong> <span style="color: ${getStatusColor(data.status as string)}; font-weight: bold;">${formatStatus(data.status as string)}</span></p>
        <p><strong>Property:</strong> ${data.propertyName}</p>
        <p><strong>Unit:</strong> ${data.unitNumber}</p>
      </div>
      <p>Log in to your dashboard to view more details.</p>
    `,
  }),

  payment_received: (data: Record<string, unknown>) => ({
    subject: `Payment Received - $${data.amount}`,
    html: `
      <h2>Payment Confirmation</h2>
      <p>We have received your rent payment. Thank you!</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Amount:</strong> $${data.amount}</p>
        <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
        <p><strong>Property:</strong> ${data.propertyName}</p>
        <p><strong>Unit:</strong> ${data.unitNumber}</p>
        <p><strong>Invoice #:</strong> ${data.invoiceNumber || 'N/A'}</p>
      </div>
      <p>A receipt has been generated and is available in your dashboard.</p>
    `,
  }),

  tenant_assigned: (data: Record<string, unknown>) => ({
    subject: `Welcome to ${data.propertyName}!`,
    html: `
      <h2>Welcome to Your New Home!</h2>
      <p>You have been assigned to a new unit. Here are your details:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Property:</strong> ${data.propertyName}</p>
        <p><strong>Unit:</strong> ${data.unitNumber}</p>
        <p><strong>Monthly Rent:</strong> $${data.monthlyRent}</p>
        <p><strong>Lease Start:</strong> ${data.leaseStart}</p>
        <p><strong>Lease End:</strong> ${data.leaseEnd}</p>
      </div>
      <p>Log in to your tenant portal to:</p>
      <ul>
        <li>View your lease details</li>
        <li>Submit maintenance requests</li>
        <li>Make rent payments</li>
        <li>Access important documents</li>
      </ul>
    `,
  }),
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#6b7280',
  }
  return colors[status] || '#6b7280'
}

function formatStatus(status: string): string {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set - email will not be sent')
      return new Response(
        JSON.stringify({ success: false, message: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: EmailPayload = await req.json()
    const { type, recipientEmail, recipientName, data } = payload

    if (!type || !recipientEmail || !emailTemplates[type]) {
      return new Response(
        JSON.stringify({ error: 'Invalid email type or missing recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const template = emailTemplates[type](data)
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@tenantmate.app'
    const appName = 'TenantMate'

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${appName} <${fromEmail}>`,
        to: [recipientEmail],
        subject: template.subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${appName}</h1>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              ${template.html}
            </div>
            <div style="text-align: center; padding: 16px; color: #6b7280; font-size: 12px;">
              <p>This email was sent by ${appName}. Please do not reply to this email.</p>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseData = await emailResponse.json()
    console.log('Email sent successfully:', responseData)

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
