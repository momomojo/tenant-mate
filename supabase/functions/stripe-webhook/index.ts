// Updated January 2026 - Using current Supabase Edge Functions patterns
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2024-11-20',
})

// Create crypto provider for async webhook verification
const cryptoProvider = Stripe.createSubtleCryptoProvider()

// Helper function to send payment confirmation email
async function sendPaymentConfirmationEmail(paymentData: {
  recipientEmail: string
  recipientName: string
  amount: number
  paymentDate: string
  propertyName: string
  unitNumber: string
  invoiceNumber?: number
}) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Call the email notification Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: 'payment_received',
        recipientEmail: paymentData.recipientEmail,
        recipientName: paymentData.recipientName,
        data: {
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          propertyName: paymentData.propertyName,
          unitNumber: paymentData.unitNumber,
          invoiceNumber: paymentData.invoiceNumber,
        },
      }),
    })

    if (!response.ok) {
      console.error('Failed to send payment confirmation email:', await response.text())
    } else {
      console.log('Payment confirmation email sent successfully')
    }
  } catch (error) {
    console.error('Error sending payment confirmation email:', error)
    // Don't throw - email failure shouldn't break the webhook
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()

    // Use async webhook verification with crypto provider (current 2026 pattern)
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )

    // Use service role key to bypass RLS for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Processing webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const paymentId = session.metadata?.payment_id

        if (paymentId) {
          // Update rent_payments status
          await supabaseClient
            .from('rent_payments')
            .update({
              status: 'paid',
              payment_method: session.payment_method_types?.[0] || 'card'
            })
            .eq('id', paymentId)

          // Update payment_transactions status
          await supabaseClient
            .from('payment_transactions')
            .update({
              status: 'completed',
              stripe_payment_intent_id: session.payment_intent,
              payment_method: session.payment_method_types?.[0] || 'card'
            })
            .eq('rent_payment_id', paymentId)

          // Fetch payment details for email notification
          const { data: paymentDetails } = await supabaseClient
            .from('rent_payments')
            .select(`
              id,
              amount,
              payment_date,
              invoice_number,
              tenant:profiles!rent_payments_tenant_id_fkey(email, first_name, last_name),
              unit:units!rent_payments_unit_id_fkey(
                unit_number,
                property:properties(name)
              )
            `)
            .eq('id', paymentId)
            .single()

          // Send payment confirmation email
          if (paymentDetails?.tenant?.email) {
            await sendPaymentConfirmationEmail({
              recipientEmail: paymentDetails.tenant.email,
              recipientName: `${paymentDetails.tenant.first_name || ''} ${paymentDetails.tenant.last_name || ''}`.trim() || 'Tenant',
              amount: paymentDetails.amount,
              paymentDate: new Date(paymentDetails.payment_date).toLocaleDateString(),
              propertyName: paymentDetails.unit?.property?.name || 'Property',
              unitNumber: paymentDetails.unit?.unit_number || 'Unit',
              invoiceNumber: paymentDetails.invoice_number,
            })
          }
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata?.session_id)
        const paymentId = session.metadata?.payment_id

        if (paymentId) {
          // Update rent_payments status
          await supabaseClient
            .from('rent_payments')
            .update({ status: 'failed' })
            .eq('id', paymentId)

          // Update payment_transactions status
          await supabaseClient
            .from('payment_transactions')
            .update({
              status: 'failed',
              stripe_payment_intent_id: paymentIntent.id
            })
            .eq('rent_payment_id', paymentId)
        }
        break
      }
      case 'payment_intent.processing': {
        const paymentIntent = event.data.object
        const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata?.session_id)
        const paymentId = session.metadata?.payment_id

        if (paymentId) {
          // Update both tables to processing status
          await supabaseClient
            .from('rent_payments')
            .update({ status: 'processing' })
            .eq('id', paymentId)

          await supabaseClient
            .from('payment_transactions')
            .update({
              status: 'processing',
              stripe_payment_intent_id: paymentIntent.id
            })
            .eq('rent_payment_id', paymentId)
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object
        const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string)
        const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata?.session_id)
        const paymentId = session.metadata?.payment_id

        if (paymentId) {
          // Update both tables to refunded status
          await supabaseClient
            .from('rent_payments')
            .update({ status: 'refunded' })
            .eq('id', paymentId)

          await supabaseClient
            .from('payment_transactions')
            .update({
              status: 'refunded',
              stripe_payment_intent_id: paymentIntent.id
            })
            .eq('rent_payment_id', paymentId)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error processing webhook:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
