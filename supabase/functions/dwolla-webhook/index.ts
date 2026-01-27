import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const DWOLLA_WEBHOOK_SECRET = Deno.env.get("DWOLLA_WEBHOOK_SECRET");

interface DwollaWebhookEvent {
  id: string;
  resourceId: string;
  topic: string;
  timestamp: string;
  _links: {
    self: { href: string };
    resource: { href: string };
    account: { href: string };
    customer?: { href: string };
  };
  _embedded?: Record<string, unknown>;
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Dwolla doesn't send preflight requests, but handle just in case
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.text();
    const signature = req.headers.get("X-Request-Signature-SHA-256");

    // Verify signature in production
    if (DWOLLA_WEBHOOK_SECRET && signature) {
      if (!verifyWebhookSignature(payload, signature, DWOLLA_WEBHOOK_SECRET)) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event: DwollaWebhookEvent = JSON.parse(payload);
    console.log("Dwolla webhook received:", event.topic, event.id);

    // Store the webhook event
    const { error: insertError } = await supabase
      .from("dwolla_webhook_events")
      .insert({
        event_id: event.id,
        topic: event.topic,
        resource_id: event.resourceId,
        payload: event,
      });

    if (insertError) {
      console.error("Failed to store webhook event:", insertError);
    }

    // Process based on topic
    switch (event.topic) {
      case "transfer_completed": {
        // Find the transfer by Dwolla ID
        const { data: transfer } = await supabase
          .from("dwolla_transfers")
          .select("*")
          .eq("dwolla_transfer_id", event.resourceId)
          .single();

        if (transfer) {
          // Update transfer status
          await supabase
            .from("dwolla_transfers")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", transfer.id);

          // The trigger will update rent_payments and create payment_transaction
          console.log(`Transfer ${event.resourceId} completed`);
        }
        break;
      }

      case "transfer_failed": {
        const { data: transfer } = await supabase
          .from("dwolla_transfers")
          .select("*")
          .eq("dwolla_transfer_id", event.resourceId)
          .single();

        if (transfer) {
          await supabase
            .from("dwolla_transfers")
            .update({
              status: "failed",
              failure_reason: "Transfer failed - check Dwolla dashboard for details",
            })
            .eq("id", transfer.id);

          // Update rent payment
          await supabase
            .from("rent_payments")
            .update({ status: "failed" })
            .eq("id", transfer.rent_payment_id);

          console.log(`Transfer ${event.resourceId} failed`);
        }
        break;
      }

      case "transfer_cancelled": {
        const { data: transfer } = await supabase
          .from("dwolla_transfers")
          .select("*")
          .eq("dwolla_transfer_id", event.resourceId)
          .single();

        if (transfer) {
          await supabase
            .from("dwolla_transfers")
            .update({ status: "cancelled" })
            .eq("id", transfer.id);

          await supabase
            .from("rent_payments")
            .update({ status: "pending" })
            .eq("id", transfer.rent_payment_id);

          console.log(`Transfer ${event.resourceId} cancelled`);
        }
        break;
      }

      case "customer_funding_source_verified": {
        // Extract customer ID from resource URL
        const fundingSourceId = event.resourceId;

        // Update any processor with this funding source
        await supabase
          .from("payment_processors")
          .update({
            dwolla_verified: true,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("dwolla_funding_source_id", fundingSourceId);

        // Also update tenant payment methods
        await supabase
          .from("tenant_payment_methods")
          .update({ bank_verified: true })
          .eq("dwolla_funding_source_id", fundingSourceId);

        console.log(`Funding source ${fundingSourceId} verified`);
        break;
      }

      case "customer_funding_source_removed": {
        const fundingSourceId = event.resourceId;

        await supabase
          .from("payment_processors")
          .update({
            dwolla_funding_source_id: null,
            dwolla_funding_source_name: null,
            dwolla_verified: false,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("dwolla_funding_source_id", fundingSourceId);

        await supabase
          .from("tenant_payment_methods")
          .update({ status: "removed" })
          .eq("dwolla_funding_source_id", fundingSourceId);

        console.log(`Funding source ${fundingSourceId} removed`);
        break;
      }

      case "customer_verified": {
        // Customer passed verification
        const customerUrl = event._links.resource.href;
        const customerId = customerUrl.split("/").pop();

        await supabase
          .from("payment_processors")
          .update({
            verification_status: "verified",
            updated_at: new Date().toISOString(),
          })
          .eq("dwolla_customer_id", customerId);

        console.log(`Customer ${customerId} verified`);
        break;
      }

      case "customer_suspended": {
        const customerUrl = event._links.resource.href;
        const customerId = customerUrl.split("/").pop();

        await supabase
          .from("payment_processors")
          .update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("dwolla_customer_id", customerId);

        console.log(`Customer ${customerId} suspended`);
        break;
      }

      default:
        console.log(`Unhandled webhook topic: ${event.topic}`);
    }

    // Mark event as processed
    await supabase
      .from("dwolla_webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", event.id);

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);

    // Still return 200 to prevent Dwolla from retrying
    return new Response(
      JSON.stringify({ received: true, error: "Processing error" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
