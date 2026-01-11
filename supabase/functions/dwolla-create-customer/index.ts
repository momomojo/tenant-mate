import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dwolla API configuration
const DWOLLA_ENV = Deno.env.get("DWOLLA_ENV") || "sandbox"; // sandbox or production
const DWOLLA_KEY = Deno.env.get("DWOLLA_KEY");
const DWOLLA_SECRET = Deno.env.get("DWOLLA_SECRET");

const DWOLLA_API_URL = DWOLLA_ENV === "production"
  ? "https://api.dwolla.com"
  : "https://api-sandbox.dwolla.com";

const DWOLLA_TOKEN_URL = DWOLLA_ENV === "production"
  ? "https://api.dwolla.com/token"
  : "https://api-sandbox.dwolla.com/token";

interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  type?: "personal" | "business"; // Default: personal
  businessName?: string;
  ipAddress?: string;
}

async function getDwollaAccessToken(): Promise<string> {
  const credentials = btoa(`${DWOLLA_KEY}:${DWOLLA_SECRET}`);

  const response = await fetch(DWOLLA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Dwolla token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createDwollaCustomer(
  accessToken: string,
  customerData: CreateCustomerRequest
): Promise<{ customerId: string; customerUrl: string }> {
  const body: Record<string, unknown> = {
    firstName: customerData.firstName,
    lastName: customerData.lastName,
    email: customerData.email,
    type: customerData.type || "personal",
  };

  if (customerData.businessName) {
    body.businessName = customerData.businessName;
  }

  if (customerData.ipAddress) {
    body.ipAddress = customerData.ipAddress;
  }

  const response = await fetch(`${DWOLLA_API_URL}/customers`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.dwolla.v1.hal+json",
      "Accept": "application/vnd.dwolla.v1.hal+json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dwolla customer: ${JSON.stringify(error)}`);
  }

  // Get customer URL from Location header
  const customerUrl = response.headers.get("Location");
  if (!customerUrl) {
    throw new Error("No customer URL returned from Dwolla");
  }

  // Extract customer ID from URL
  const customerId = customerUrl.split("/").pop();

  return { customerId: customerId!, customerUrl };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Dwolla credentials are configured
    if (!DWOLLA_KEY || !DWOLLA_SECRET) {
      throw new Error("Dwolla API credentials not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { firstName, lastName, email, type, businessName } = await req.json() as CreateCustomerRequest;

    if (!firstName || !lastName || !email) {
      throw new Error("firstName, lastName, and email are required");
    }

    // Get Dwolla access token
    const accessToken = await getDwollaAccessToken();

    // Create customer in Dwolla
    const { customerId, customerUrl } = await createDwollaCustomer(accessToken, {
      firstName,
      lastName,
      email,
      type,
      businessName,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Store in database
    const { data: processor, error: dbError } = await supabase
      .from("payment_processors")
      .upsert({
        user_id: user.id,
        processor: "dwolla",
        dwolla_customer_id: customerId,
        dwolla_customer_url: customerUrl,
        status: "pending",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,processor",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save Dwolla customer");
    }

    return new Response(
      JSON.stringify({
        success: true,
        customerId,
        customerUrl,
        processorId: processor.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating Dwolla customer:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
