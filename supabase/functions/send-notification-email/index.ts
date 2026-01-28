// Updated January 2026 - Security hardened
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'
import { escapeHtml } from '../_shared/security.ts'

interface EmailPayload {
  type: 'maintenance_created' | 'maintenance_status_changed' | 'payment_received' | 'tenant_assigned' | 'applicant_invited'
  recipientEmail: string
  recipientName: string
  data: Record<string, unknown>
}

const emailTemplates = {
  maintenance_created: (data: Record<string, unknown>) => ({
    subject: `New Maintenance Request: ${escapeHtml(String(data.title || ''))}`,
    html: `
      <h2>New Maintenance Request Submitted</h2>
      <p>A new maintenance request has been submitted for your property.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Title:</strong> ${escapeHtml(String(data.title || ''))}</p>
        <p><strong>Description:</strong> ${escapeHtml(String(data.description || ''))}</p>
        <p><strong>Priority:</strong> ${escapeHtml(String(data.priority || ''))}</p>
        <p><strong>Property:</strong> ${escapeHtml(String(data.propertyName || ''))}</p>
        <p><strong>Unit:</strong> ${escapeHtml(String(data.unitNumber || ''))}</p>
        <p><strong>Submitted by:</strong> ${escapeHtml(String(data.tenantName || ''))}</p>
      </div>
      <p>Please log in to your dashboard to review and respond to this request.</p>
    `,
  }),

  maintenance_status_changed: (data: Record<string, unknown>) => ({
    subject: `Maintenance Request Update: ${escapeHtml(String(data.title || ''))}`,
    html: `
      <h2>Maintenance Request Status Updated</h2>
      <p>Your maintenance request status has been updated.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Title:</strong> ${escapeHtml(String(data.title || ''))}</p>
        <p><strong>New Status:</strong> <span style="color: ${getStatusColor(String(data.status || ''))}; font-weight: bold;">${formatStatus(String(data.status || ''))}</span></p>
        <p><strong>Property:</strong> ${escapeHtml(String(data.propertyName || ''))}</p>
        <p><strong>Unit:</strong> ${escapeHtml(String(data.unitNumber || ''))}</p>
      </div>
      <p>Log in to your dashboard to view more details.</p>
    `,
  }),

  payment_received: (data: Record<string, unknown>) => ({
    subject: `Payment Received - $${Number(data.amount || 0).toFixed(2)}`,
    html: `
      <h2>Payment Confirmation</h2>
      <p>We have received your rent payment. Thank you!</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Amount:</strong> $${Number(data.amount || 0).toFixed(2)}</p>
        <p><strong>Payment Date:</strong> ${escapeHtml(String(data.paymentDate || ''))}</p>
        <p><strong>Property:</strong> ${escapeHtml(String(data.propertyName || ''))}</p>
        <p><strong>Unit:</strong> ${escapeHtml(String(data.unitNumber || ''))}</p>
        <p><strong>Invoice #:</strong> ${escapeHtml(String(data.invoiceNumber || 'N/A'))}</p>
      </div>
      <p>A receipt has been generated and is available in your dashboard.</p>
    `,
  }),

  tenant_assigned: (data: Record<string, unknown>) => ({
    subject: `Welcome to ${escapeHtml(String(data.propertyName || ''))}!`,
    html: `
      <h2>Welcome to Your New Home!</h2>
      <p>You have been assigned to a new unit. Here are your details:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Property:</strong> ${escapeHtml(String(data.propertyName || ''))}</p>
        <p><strong>Unit:</strong> ${escapeHtml(String(data.unitNumber || ''))}</p>
        <p><strong>Monthly Rent:</strong> $${Number(data.monthlyRent || 0).toFixed(2)}</p>
        <p><strong>Lease Start:</strong> ${escapeHtml(String(data.leaseStart || ''))}</p>
        <p><strong>Lease End:</strong> ${escapeHtml(String(data.leaseEnd || ''))}</p>
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

  applicant_invited: (data: Record<string, unknown>) => ({
    subject: `You're Invited to Apply at ${escapeHtml(String(data.propertyName || ''))}`,
    html: `
      <h2>You're Invited to Apply!</h2>
      <p>Great news! You've been invited to apply for a rental property.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Property:</strong> ${escapeHtml(String(data.propertyName || ''))}</p>
        <p><strong>Address:</strong> ${escapeHtml(String(data.propertyAddress || ''))}</p>
        ${data.unitNumber ? `<p><strong>Unit:</strong> ${escapeHtml(String(data.unitNumber))}</p>` : ''}
      </div>
      <p>Click the button below to complete your application:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${escapeHtml(String(data.applicationUrl || '#'))}"
           style="display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Start Application
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${escapeHtml(String(data.applicationUrl || ''))}</p>
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
  const corsHeaders = getCorsHeaders(req)

  const preflightResponse = handleCorsPreflightOrRestrict(req)
  if (preflightResponse) return preflightResponse

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
