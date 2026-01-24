import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'

const DROPBOX_SIGN_API_KEY = Deno.env.get("DROPBOX_SIGN_API_KEY");
const DROPBOX_SIGN_CLIENT_ID = Deno.env.get("DROPBOX_SIGN_CLIENT_ID");
const DROPBOX_SIGN_API_URL = "https://api.hellosign.com/v3";

interface SendRequestInput {
  leaseId: string;
  signerEmail: string;
  signerName: string;
  title?: string;
  message?: string;
  testMode?: boolean;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflightOrRestrict(req);
  if (preflightResponse) return preflightResponse;

  try {
    if (!DROPBOX_SIGN_API_KEY || !DROPBOX_SIGN_CLIENT_ID) {
      throw new Error("Dropbox Sign API credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is a property manager
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["property_manager", "admin"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Only property managers can send signature requests" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { leaseId, signerEmail, signerName, title, message, testMode } = await req.json() as SendRequestInput;

    if (!leaseId || !signerEmail || !signerName) {
      throw new Error("leaseId, signerEmail, and signerName are required");
    }

    // Fetch lease details
    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select(`
        *,
        property:properties(id, name, address, created_by, property_manager_id),
        unit:units(id, unit_number),
        tenant:profiles!leases_tenant_id_fkey(id, first_name, last_name, email)
      `)
      .eq("id", leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error("Lease not found");
    }

    // Verify user owns this property
    if (lease.property.created_by !== user.id && lease.property.property_manager_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized for this lease" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build lease document content as PDF-ready text
    const leaseTitle = title || `Lease Agreement - ${lease.property.name} Unit ${lease.unit?.unit_number || ""}`;
    const leaseMessage = message || `Please review and sign your lease agreement for ${lease.property.address}.`;

    // Create embedded signature request via Dropbox Sign API
    const formData = new FormData();
    formData.append("client_id", DROPBOX_SIGN_CLIENT_ID);
    formData.append("title", leaseTitle);
    formData.append("subject", leaseTitle);
    formData.append("message", leaseMessage);
    formData.append("signers[0][email_address]", signerEmail);
    formData.append("signers[0][name]", signerName);
    formData.append("signers[0][order]", "0");
    formData.append("test_mode", testMode !== false ? "1" : "0"); // Default to test mode

    // If lease has content, create a simple text file to sign
    // In production, you'd generate a proper PDF from a template
    if (lease.content) {
      const blob = new Blob([lease.content], { type: "text/plain" });
      formData.append("files[0]", blob, "lease-agreement.txt");
    } else {
      // Generate a basic lease document
      const leaseDoc = generateLeaseDocument(lease);
      const blob = new Blob([leaseDoc], { type: "text/plain" });
      formData.append("files[0]", blob, "lease-agreement.txt");
    }

    // Add form fields for signature and date
    formData.append("form_fields_per_document", JSON.stringify([[
      {
        api_id: "signature_1",
        type: "signature",
        x: 72,
        y: 700,
        width: 200,
        height: 30,
        required: true,
        signer: 0,
        page: 1,
      },
      {
        api_id: "date_1",
        type: "date_signed",
        x: 300,
        y: 700,
        width: 150,
        height: 20,
        required: true,
        signer: 0,
        page: 1,
      },
    ]]));

    // Add metadata for tracking
    formData.append("metadata[lease_id]", leaseId);
    formData.append("metadata[property_id]", lease.property_id);
    formData.append("metadata[tenant_id]", lease.tenant_id);

    const credentials = btoa(`${DROPBOX_SIGN_API_KEY}:`);

    const response = await fetch(`${DROPBOX_SIGN_API_URL}/signature_request/create_embedded`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Dropbox Sign API error:", errorData);
      throw new Error(`Dropbox Sign API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const signatureRequest = result.signature_request;

    // Update lease with signature request info
    const { error: updateError } = await supabase
      .from("leases")
      .update({
        signature_provider: "dropbox_sign",
        signature_request_id: signatureRequest.signature_request_id,
        signature_status: "sent",
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leaseId);

    if (updateError) {
      console.error("Failed to update lease:", updateError);
    }

    // Store the signature event
    await supabase.from("dropbox_sign_events").insert({
      event_type: "signature_request_created",
      signature_request_id: signatureRequest.signature_request_id,
      lease_id: leaseId,
      payload: signatureRequest,
    });

    // Extract signature IDs for embedded signing
    const signatures = signatureRequest.signatures.map((sig: { signature_id: string; signer_email_address: string; status_code: string }) => ({
      signatureId: sig.signature_id,
      signerEmail: sig.signer_email_address,
      status: sig.status_code,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        signatureRequestId: signatureRequest.signature_request_id,
        signatures,
        title: signatureRequest.title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending signature request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send signature request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateLeaseDocument(lease: Record<string, unknown>): string {
  const property = lease.property as { name: string; address: string };
  const unit = lease.unit as { unit_number: string } | null;
  const tenant = lease.tenant as { first_name: string | null; last_name: string | null } | null;

  return `
RESIDENTIAL LEASE AGREEMENT

Property: ${property.name}
Address: ${property.address}
Unit: ${unit?.unit_number || "N/A"}

Tenant: ${tenant?.first_name || ""} ${tenant?.last_name || ""}

LEASE TERMS:
- Start Date: ${lease.lease_start}
- End Date: ${lease.lease_end}
- Monthly Rent: $${(lease.monthly_rent as number).toFixed(2)}
- Security Deposit: $${(lease.security_deposit as number).toFixed(2)}
- Late Fee: $${(lease.late_fee as number).toFixed(2)}
- Grace Period: ${lease.grace_period_days} days

By signing below, the tenant agrees to the terms and conditions of this lease agreement.



Tenant Signature: ____________________    Date: ____________
`.trim();
}
