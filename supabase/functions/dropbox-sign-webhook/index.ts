import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DROPBOX_SIGN_API_KEY = Deno.env.get("DROPBOX_SIGN_API_KEY");

interface DropboxSignEvent {
  event: {
    event_type: string;
    event_time: string;
    event_hash: string;
    event_metadata?: {
      reported_for_account_id?: string;
      reported_for_app_id?: string;
      related_signature_id?: string;
    };
  };
  signature_request?: {
    signature_request_id: string;
    title: string;
    is_complete: boolean;
    is_declined: boolean;
    has_error: boolean;
    metadata: Record<string, string>;
    signatures: Array<{
      signature_id: string;
      signer_email_address: string;
      signer_name: string;
      status_code: string;
      signed_at: number | null;
      last_viewed_at: number | null;
    }>;
  };
}

async function verifyEventHash(apiKey: string, eventData: DropboxSignEvent): Promise<boolean> {
  try {
    const eventTime = eventData.event.event_time;
    const eventType = eventData.event.event_type;
    const expectedHash = eventData.event.event_hash;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${eventTime}${eventType}`)
    );

    const computedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash.length !== expectedHash.length) return false;
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return result === 0;
  } catch (err) {
    console.error("Hash verification error:", err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse the event data
    const contentType = req.headers.get("content-type") || "";
    let eventData: DropboxSignEvent;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const jsonField = formData.get("json");
      if (!jsonField || typeof jsonField !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing json field" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      eventData = JSON.parse(jsonField);
    } else {
      eventData = await req.json();
    }

    const eventType = eventData.event.event_type;
    console.log("Dropbox Sign webhook received:", eventType);

    // Respond to callback test immediately
    if (eventType === "callback_test") {
      return new Response("Hello API Event Received", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Verify event hash
    if (DROPBOX_SIGN_API_KEY) {
      const isValid = await verifyEventHash(DROPBOX_SIGN_API_KEY, eventData);
      if (!isValid) {
        console.error("Invalid event hash");
        return new Response("Invalid event hash", { status: 401 });
      }
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const signatureRequest = eventData.signature_request;
    if (!signatureRequest) {
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const signatureRequestId = signatureRequest.signature_request_id;
    const leaseId = signatureRequest.metadata?.lease_id;

    // Store the webhook event
    await supabase.from("dropbox_sign_events").insert({
      event_type: eventType,
      signature_request_id: signatureRequestId,
      lease_id: leaseId || null,
      payload: eventData,
    });

    // Process based on event type
    switch (eventType) {
      case "signature_request_viewed": {
        if (leaseId) {
          await supabase
            .from("leases")
            .update({
              signature_status: "viewed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", leaseId)
            .eq("signature_status", "sent");
        }
        break;
      }

      case "signature_request_signed": {
        if (leaseId) {
          const relatedSigId = eventData.event.event_metadata?.related_signature_id;
          const signedSignature = signatureRequest.signatures.find(
            s => s.signature_id === relatedSigId
          );

          const updates: Record<string, unknown> = {
            signature_status: "partially_signed",
            updated_at: new Date().toISOString(),
          };

          if (signedSignature?.signed_at) {
            updates.tenant_signed_at = new Date(signedSignature.signed_at * 1000).toISOString();
          }

          await supabase.from("leases").update(updates).eq("id", leaseId);
        }
        break;
      }

      case "signature_request_all_signed": {
        if (leaseId) {
          const tenantSig = signatureRequest.signatures[0];
          await supabase
            .from("leases")
            .update({
              signature_status: "completed",
              status: "signed",
              tenant_signed_at: tenantSig?.signed_at
                ? new Date(tenantSig.signed_at * 1000).toISOString()
                : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", leaseId);

          // Download signed PDF
          if (DROPBOX_SIGN_API_KEY) {
            try {
              const credentials = btoa(`${DROPBOX_SIGN_API_KEY}:`);
              const pdfResponse = await fetch(
                `https://api.hellosign.com/v3/signature_request/files/${signatureRequestId}?file_type=pdf`,
                { headers: { "Authorization": `Basic ${credentials}` } }
              );

              if (pdfResponse.ok) {
                const pdfBuffer = await pdfResponse.arrayBuffer();
                const storagePath = `leases/${leaseId}/signed-${Date.now()}.pdf`;

                await supabase.storage
                  .from("lease-documents")
                  .upload(storagePath, pdfBuffer, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                await supabase
                  .from("leases")
                  .update({ signed_document_path: storagePath })
                  .eq("id", leaseId);
              }
            } catch (err) {
              console.error("Failed to download signed document:", err);
            }
          }
        }
        break;
      }

      case "signature_request_declined": {
        if (leaseId) {
          await supabase.from("leases").update({
            signature_status: "declined",
            status: "draft",
            updated_at: new Date().toISOString(),
          }).eq("id", leaseId);
        }
        break;
      }

      case "signature_request_expired": {
        if (leaseId) {
          await supabase.from("leases").update({
            signature_status: "expired",
            status: "draft",
            updated_at: new Date().toISOString(),
          }).eq("id", leaseId);
        }
        break;
      }

      case "signature_request_canceled": {
        if (leaseId) {
          await supabase.from("leases").update({
            signature_status: "not_sent",
            status: "draft",
            signature_request_id: null,
            updated_at: new Date().toISOString(),
          }).eq("id", leaseId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Mark event as processed
    await supabase
      .from("dropbox_sign_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("signature_request_id", signatureRequestId)
      .eq("event_type", eventType)
      .eq("processed", false);

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
