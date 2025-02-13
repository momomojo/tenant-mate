
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log("Portal session function invoked with method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let requestBody: any;
  try {
    const text = await req.text();
    console.log("Raw request body text:", text);
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Empty request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    requestBody = JSON.parse(text);
    console.log("Parsed request body:", requestBody);
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    return new Response(
      JSON.stringify({
        error: "Invalid JSON format",
        details: parseError.message,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { return_url } = requestBody;
  if (!return_url) {
    console.error("Missing return_url in request body", requestBody);
    return new Response(
      JSON.stringify({ error: "return_url is required", receivedBody: requestBody }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    new URL(return_url);
  } catch (urlError) {
    console.error("Invalid return_url format:", urlError);
    return new Response(
      JSON.stringify({ error: "Invalid return_url format", details: urlError.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !user) {
    console.error("Authentication error:", userError);
    return new Response(
      JSON.stringify({ error: "Authentication failed", details: userError?.message }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Authenticated user:", user.email);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  let customerId: string;
  let retries = 3;
  
  while (retries > 0) {
    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Found existing customer:", customerId);
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
        console.log("Created new customer:", customerId);
      }
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error("All retries failed for customer operation:", error);
        return new Response(
          JSON.stringify({ error: "Failed to retrieve or create customer", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Retry attempt ${3 - retries} for customer operation`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  try {
    const { data: configs, error: configError } = await supabaseClient
      .from("stripe_configurations")
      .select("portal_configuration_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (configError) throw configError;

    let sessionConfig: any = {
      customer: customerId,
      return_url: return_url,
    };

    if (configs?.portal_configuration_id) {
      console.log("Using portal configuration:", configs.portal_configuration_id);
      sessionConfig.configuration = configs.portal_configuration_id;
    }

    const session = await stripe.billingPortal.sessions.create(sessionConfig);
    console.log("Portal session created with URL:", session.url);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating portal session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create portal session", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
