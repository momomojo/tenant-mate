import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'

const DWOLLA_ENV = Deno.env.get("DWOLLA_ENV") || "sandbox";
const DWOLLA_KEY = Deno.env.get("DWOLLA_KEY");
const DWOLLA_SECRET = Deno.env.get("DWOLLA_SECRET");

const DWOLLA_API_URL = DWOLLA_ENV === "production"
  ? "https://api.dwolla.com"
  : "https://api-sandbox.dwolla.com";

const DWOLLA_TOKEN_URL = DWOLLA_ENV === "production"
  ? "https://api.dwolla.com/token"
  : "https://api-sandbox.dwolla.com/token";

interface AddFundingSourceRequest {
  routingNumber: string;
  accountNumber: string;
  bankAccountType: "checking" | "savings";
  name: string; // Name on the account
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
    throw new Error("Failed to get Dwolla token");
  }

  const data = await response.json();
  return data.access_token;
}

async function addFundingSource(
  accessToken: string,
  customerUrl: string,
  fundingData: AddFundingSourceRequest
): Promise<{ fundingSourceId: string; fundingSourceUrl: string }> {
  const response = await fetch(`${customerUrl}/funding-sources`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.dwolla.v1.hal+json",
      "Accept": "application/vnd.dwolla.v1.hal+json",
    },
    body: JSON.stringify({
      routingNumber: fundingData.routingNumber,
      accountNumber: fundingData.accountNumber,
      bankAccountType: fundingData.bankAccountType,
      name: fundingData.name,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to add funding source: ${JSON.stringify(error)}`);
  }

  const fundingSourceUrl = response.headers.get("Location");
  if (!fundingSourceUrl) {
    throw new Error("No funding source URL returned");
  }

  const fundingSourceId = fundingSourceUrl.split("/").pop();

  return { fundingSourceId: fundingSourceId!, fundingSourceUrl };
}

async function initiateMicroDeposits(
  accessToken: string,
  fundingSourceUrl: string
): Promise<void> {
  const response = await fetch(`${fundingSourceUrl}/micro-deposits`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.dwolla.v1.hal+json",
    },
  });

  if (!response.ok && response.status !== 201) {
    console.warn("Micro-deposits may already be initiated or not required");
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  const preflightResponse = handleCorsPreflightOrRestrict(req)
  if (preflightResponse) return preflightResponse

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

    // Get user's Dwolla customer
    const { data: processor, error: processorError } = await supabase
      .from("payment_processors")
      .select("*")
      .eq("user_id", user.id)
      .eq("processor", "dwolla")
      .single();

    if (processorError || !processor?.dwolla_customer_url) {
      throw new Error("Dwolla customer not found. Please create a customer first.");
    }

    const { routingNumber, accountNumber, bankAccountType, name } =
      await req.json() as AddFundingSourceRequest;

    if (!routingNumber || !accountNumber || !bankAccountType || !name) {
      throw new Error("routingNumber, accountNumber, bankAccountType, and name are required");
    }

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(routingNumber)) {
      throw new Error("Invalid routing number format");
    }

    const accessToken = await getDwollaAccessToken();

    // Add funding source
    const { fundingSourceId, fundingSourceUrl } = await addFundingSource(
      accessToken,
      processor.dwolla_customer_url,
      { routingNumber, accountNumber, bankAccountType, name }
    );

    // Initiate micro-deposits for verification (sandbox auto-verifies)
    if (DWOLLA_ENV !== "sandbox") {
      await initiateMicroDeposits(accessToken, fundingSourceUrl);
    }

    // Get last 4 digits of account
    const last4 = accountNumber.slice(-4);

    // Update payment processor with funding source
    const { error: updateError } = await supabase
      .from("payment_processors")
      .update({
        dwolla_funding_source_id: fundingSourceId,
        dwolla_funding_source_name: `${name} ****${last4}`,
        dwolla_verified: DWOLLA_ENV === "sandbox", // Auto-verify in sandbox
        status: DWOLLA_ENV === "sandbox" ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", processor.id);

    if (updateError) {
      throw new Error("Failed to update payment processor");
    }

    // Also create a tenant payment method record if this is a tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "tenant") {
      await supabase
        .from("tenant_payment_methods")
        .insert({
          tenant_id: user.id,
          method_type: "bank_account",
          dwolla_funding_source_id: fundingSourceId,
          bank_name: name,
          bank_account_type: bankAccountType,
          bank_last4: last4,
          bank_verified: DWOLLA_ENV === "sandbox",
          is_default: true,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        fundingSourceId,
        verified: DWOLLA_ENV === "sandbox",
        message: DWOLLA_ENV === "sandbox"
          ? "Bank account added and verified (sandbox mode)"
          : "Bank account added. Please verify with micro-deposits.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error adding funding source:", error);
    return new Response(
      JSON.stringify({ error: "Failed to add funding source" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
