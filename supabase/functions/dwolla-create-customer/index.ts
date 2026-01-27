import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://tenant-mate.vercel.app',
  'https://momomojo.github.io',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  }
}

// Dwolla API configuration
const DWOLLA_ENV = Deno.env.get("DWOLLA_ENV") || "sandbox";
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
  type?: "personal" | "business";
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
  // Use "receive-only" type for simpler verification - property managers only need to receive payments
  // "receive-only" customers require only firstName, lastName, and email
  const body: Record<string, unknown> = {
    firstName: customerData.firstName,
    lastName: customerData.lastName,
    email: customerData.email,
    type: customerData.type || "receive-only",
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

    // Handle duplicate customer case - extract existing customer from error
    if (error.code === "ValidationError" && error._embedded?.errors) {
      const duplicateError = error._embedded.errors.find(
        (e: { code: string }) => e.code === "Duplicate"
      );
      if (duplicateError?._links?.about?.href) {
        // Customer already exists, use the existing one
        const existingUrl = duplicateError._links.about.href;
        const existingId = existingUrl.split("/").pop();
        return { customerId: existingId!, customerUrl: existingUrl };
      }
    }

    throw new Error(`Failed to create Dwolla customer: ${JSON.stringify(error)}`);
  }

  const customerUrl = response.headers.get("Location");
  if (!customerUrl) {
    throw new Error("No customer URL returned from Dwolla");
  }

  const customerId = customerUrl.split("/").pop();

  return { customerId: customerId!, customerUrl };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!DWOLLA_KEY || !DWOLLA_SECRET) {
      throw new Error("Dwolla API credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { firstName, lastName, email, type, businessName } = await req.json() as CreateCustomerRequest;

    if (!firstName || !lastName || !email) {
      throw new Error("firstName, lastName, and email are required");
    }

    const accessToken = await getDwollaAccessToken();

    const { customerId, customerUrl } = await createDwollaCustomer(accessToken, {
      firstName,
      lastName,
      email,
      type,
      businessName,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Check if processor record already exists
    const { data: existing } = await supabase
      .from("payment_processors")
      .select("id")
      .eq("user_id", user.id)
      .eq("processor", "dwolla")
      .maybeSingle();

    let processor;
    let dbError;

    if (existing) {
      // Update existing record
      const result = await supabase
        .from("payment_processors")
        .update({
          dwolla_customer_id: customerId,
          dwolla_customer_url: customerUrl,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      processor = result.data;
      dbError = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from("payment_processors")
        .insert({
          user_id: user.id,
          processor: "dwolla",
          dwolla_customer_id: customerId,
          dwolla_customer_url: customerUrl,
          status: "pending",
        })
        .select()
        .single();
      processor = result.data;
      dbError = result.error;
    }

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
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to create customer" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
