import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'

const DROPBOX_SIGN_API_KEY = Deno.env.get("DROPBOX_SIGN_API_KEY");
const DROPBOX_SIGN_API_URL = "https://api.hellosign.com/v3";

interface GetSignUrlInput {
  signatureId: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflightOrRestrict(req);
  if (preflightResponse) return preflightResponse;

  try {
    if (!DROPBOX_SIGN_API_KEY) {
      throw new Error("Dropbox Sign API key not configured");
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

    const { signatureId } = await req.json() as GetSignUrlInput;

    if (!signatureId) {
      throw new Error("signatureId is required");
    }

    // Get the embedded sign URL from Dropbox Sign
    const credentials = btoa(`${DROPBOX_SIGN_API_KEY}:`);

    const response = await fetch(`${DROPBOX_SIGN_API_URL}/embedded/sign_url/${signatureId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Dropbox Sign API error:", errorData);
      throw new Error(`Failed to get sign URL: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const signUrl = result.embedded?.sign_url;
    const expiresAt = result.embedded?.expires_at;

    if (!signUrl) {
      throw new Error("No sign URL returned from Dropbox Sign");
    }

    return new Response(
      JSON.stringify({
        signUrl,
        expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting sign URL:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get sign URL" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
