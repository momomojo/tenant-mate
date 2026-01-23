// Updated January 2026 - Security hardened
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'
import { validatePaymentAmount, checkRateLimit, safeErrorResponse } from '../_shared/security.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // SEC-04: CORS preflight with restricted origins
  const preflightResponse = handleCorsPreflightOrRestrict(req)
  if (preflightResponse) return preflightResponse

  try {
    const { unit_id, setup_future_payments } = await req.json()

    // SEC-07: Validate unit_id is provided
    if (!unit_id) {
      throw new Error('Unit ID is required')
    }

    // Client for user auth verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Service role client for admin operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Not authenticated')
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Not authenticated')
    }

    // SEC-06: Rate limit - max 5 checkout sessions per minute per user
    if (!checkRateLimit(user.id, 5, 60000)) {
      throw new Error('Rate limit exceeded')
    }

    // SEC-01: Look up the actual rent amount from the database (don't trust client)
    const { data: unit, error: unitError } = await supabaseAdmin
      .from('units')
      .select('id, monthly_rent, unit_number, property_id')
      .eq('id', unit_id)
      .single()

    if (unitError || !unit) {
      throw new Error('Unit not found')
    }

    // SEC-01: Verify the user is actually a tenant of this unit
    const { data: tenantUnit, error: tenantUnitError } = await supabaseAdmin
      .from('tenant_units')
      .select('id')
      .eq('unit_id', unit_id)
      .eq('tenant_id', user.id)
      .maybeSingle()

    if (tenantUnitError || !tenantUnit) {
      throw new Error('You are not assigned to this unit')
    }

    // SEC-01 + SEC-07: Use the database rent amount, validate it
    const amount = validatePaymentAmount(unit.monthly_rent)

    // Initialize Stripe with current API version
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2024-11-20',
    })

    // Create a new payment record with server-validated amount
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
      .single()

    if (paymentError) {
      throw paymentError
    }

    // Create payment transaction record
    const { error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        rent_payment_id: payment.id,
        amount,
        status: 'pending',
        payment_method: 'card'
      })

    if (transactionError) {
      throw transactionError
    }

    // Get or create Stripe customer
    let customerId
    const { data: customers } = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (customers.length > 0) {
      customerId = customers[0].id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          tenant_id: user.id,
        },
      })
      customerId = customer.id
    }

    // Create Stripe checkout session with server-validated amount
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Rent Payment',
              description: `Unit ${unit.unit_number}`,
            },
            unit_amount: Math.round(amount * 100), // Convert validated amount to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      ...(setup_future_payments && {
        setup_future_usage: 'off_session',
      }),
      success_url: `${req.headers.get('origin')}/tenant-mate/payments?success=true`,
      cancel_url: `${req.headers.get('origin')}/tenant-mate/payments?canceled=true`,
      metadata: {
        payment_id: payment.id,
        tenant_id: user.id,
        unit_id,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return safeErrorResponse(error, corsHeaders)
  }
})
