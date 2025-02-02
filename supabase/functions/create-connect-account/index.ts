import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received request:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    })
  }

  try {
    // Initialize Supabase client
    console.log('Initializing Supabase client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
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
    console.log('Checking for existing Connect account...')
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
      console.log('Updating profile with Connect account ID...')
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
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?refresh=true`,
      return_url: `${origin}/settings?success=true`,
      type: 'account_onboarding',
    })

    console.log('Account link created:', accountLink.url)

    const responseData = { url: accountLink.url }
    const responseBody = JSON.stringify(responseData)
    
    // Return response with proper headers
    return new Response(responseBody, { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Length': responseBody.length.toString()
      },
      status: 200 
    })

  } catch (error) {
    console.error('Error in create-connect-account function:', error)
    const errorResponse = JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    })
    
    return new Response(errorResponse, { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Length': errorResponse.length.toString()
      },
      status: 400 
    })
  }
})