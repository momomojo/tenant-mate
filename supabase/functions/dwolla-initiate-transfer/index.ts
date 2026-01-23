import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

interface InitiateTransferRequest {
  rentPaymentId: string;
  amount: number;
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

function generateCorrelationId(): string {
  return `tm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function initiateTransfer(
  accessToken: string,
  sourceFundingSource: string,
  destinationFundingSource: string,
  amount: number,
  correlationId: string
): Promise<{ transferId: string; transferUrl: string }> {
  const response = await fetch(`${DWOLLA_API_URL}/transfers`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.dwolla.v1.hal+json",
      "Accept": "application/vnd.dwolla.v1.hal+json",
      "Idempotency-Key": correlationId,
    },
    body: JSON.stringify({
      _links: {
        source: {
          href: sourceFundingSource,
        },
        destination: {
          href: destinationFundingSource,
        },
      },
      amount: {
        currency: "USD",
        value: amount.toFixed(2),
      },
      correlationId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to initiate transfer: ${JSON.stringify(error)}`);
  }

  const transferUrl = response.headers.get("Location");
  if (!transferUrl) {
    throw new Error("No transfer URL returned");
  }

  const transferId = transferUrl.split("/").pop();

  return { transferId: transferId!, transferUrl };
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

    const { rentPaymentId, amount } = await req.json() as InitiateTransferRequest;

    if (!rentPaymentId || !amount) {
      throw new Error("rentPaymentId and amount are required");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Get rent payment details with unit -> property relationship
    const { data: rentPayment, error: paymentError } = await supabase
      .from("rent_payments")
      .select(`
        *,
        units!inner(
          id,
          property_id,
          properties!inner(
            id,
            created_by,
            property_manager_id
          )
        )
      `)
      .eq("id", rentPaymentId)
      .single();

    if (paymentError || !rentPayment) {
      throw new Error("Rent payment not found");
    }

    const tenantId = rentPayment.tenant_id;
    const landlordId = rentPayment.units.properties.created_by;

    // Verify the requesting user is the tenant
    if (user.id !== tenantId) {
      throw new Error("Only the tenant can initiate this payment");
    }

    // Get tenant's funding source
    const { data: tenantProcessor } = await supabase
      .from("payment_processors")
      .select("*")
      .eq("user_id", tenantId)
      .eq("processor", "dwolla")
      .eq("status", "active")
      .single();

    if (!tenantProcessor?.dwolla_funding_source_id) {
      throw new Error("Tenant has no verified bank account");
    }

    // Get landlord's funding source
    const { data: landlordProcessor } = await supabase
      .from("payment_processors")
      .select("*")
      .eq("user_id", landlordId)
      .eq("processor", "dwolla")
      .eq("status", "active")
      .single();

    if (!landlordProcessor?.dwolla_funding_source_id) {
      throw new Error("Landlord has not set up Dwolla. Please use card payment.");
    }

    const accessToken = await getDwollaAccessToken();
    const correlationId = generateCorrelationId();

    // Build funding source URLs
    const sourceFundingUrl = `${DWOLLA_API_URL}/funding-sources/${tenantProcessor.dwolla_funding_source_id}`;
    const destFundingUrl = `${DWOLLA_API_URL}/funding-sources/${landlordProcessor.dwolla_funding_source_id}`;

    // Initiate the transfer
    const { transferId, transferUrl } = await initiateTransfer(
      accessToken,
      sourceFundingUrl,
      destFundingUrl,
      amount,
      correlationId
    );

    // Calculate fee ($0.25 per ACH transaction)
    const fee = 0.25;
    const netAmount = amount - fee;

    // Record the transfer
    const { data: transfer, error: transferError } = await supabase
      .from("dwolla_transfers")
      .insert({
        rent_payment_id: rentPaymentId,
        tenant_id: tenantId,
        landlord_id: landlordId,
        dwolla_transfer_id: transferId,
        dwolla_transfer_url: transferUrl,
        amount,
        fee,
        net_amount: netAmount,
        source_funding_source: tenantProcessor.dwolla_funding_source_id,
        destination_funding_source: landlordProcessor.dwolla_funding_source_id,
        status: "pending",
        correlation_id: correlationId,
      })
      .select()
      .single();

    if (transferError) {
      console.error("Failed to record transfer:", transferError);
    }

    // Update rent payment status
    await supabase
      .from("rent_payments")
      .update({
        status: "processing",
        payment_method: "ach",
      })
      .eq("id", rentPaymentId);

    return new Response(
      JSON.stringify({
        success: true,
        transferId,
        amount,
        fee,
        netAmount,
        status: "pending",
        message: "ACH transfer initiated. Funds typically arrive in 1-2 business days.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error initiating transfer:", error);
    return new Response(
      JSON.stringify({ error: "Transfer initiation failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
