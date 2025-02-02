import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user data
    console.log('Verifying user authentication...')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      throw new Error('Unauthorized')
    }

    // Initialize Stripe
    console.log('Creating Stripe instance...')
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    let accountId = null
    
    // Check if user already has a Stripe Connect account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_connect_account_id) {
      console.log('Found existing Connect account:', profile.stripe_connect_account_id)
      accountId = profile.stripe_connect_account_id
    } else {
      // Create a new Connect account
      console.log('Creating new Connect account...')
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      // Update profile with new Connect account ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        throw updateError
      }
    }

    // Create an account link
    console.log('Creating account link...')
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get('origin')}/settings?refresh=true`,
      return_url: `${req.headers.get('origin')}/settings?success=true`,
      type: 'account_onboarding',
    })

    console.log('Account link created:', accountLink.url)

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in create-connect-account function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})