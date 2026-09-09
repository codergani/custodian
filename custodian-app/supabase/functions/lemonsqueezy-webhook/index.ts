// Supabase Edge Function: Lemon Squeezy Webhook Handler
// Listens for subscription events and automatically updates public.profiles in Supabase
// Deploy with: supabase functions deploy lemonsqueezy-webhook --no-verify-jwt

import { createClient } from "@supabase/supabase-js";

// Ambient declarations for IDE TypeScript compatibility
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEMONSQUEEZY_WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper: Verify HMAC-SHA256 signature from Lemon Squeezy
async function verifySignature(secret: string, signature: string, rawBody: string): Promise<boolean> {
  if (!secret) return true; // If secret is not set, allow for dev testing
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  return await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(rawBody));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Signature") || "";

    // Verify webhook signature
    const isValid = await verifySignature(LEMONSQUEEZY_WEBHOOK_SECRET, signature, rawBody);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;

    console.log(`[LemonSqueezy Webhook] Received event: ${eventName} for user: ${userId}`);

    if (!userId) {
      console.warn("[LemonSqueezy Webhook] Missing custom_data.user_id, ignoring event.");
      return new Response(JSON.stringify({ message: "No user_id supplied" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customerId = String(payload.data?.attributes?.customer_id || "");
    const subscriptionId = String(payload.data?.id || "");
    const productName = (payload.data?.attributes?.product_name || "").toLowerCase();
    const variantName = (payload.data?.attributes?.variant_name || "").toLowerCase();

    // Determine target plan
    let newPlan = "pro";
    if (productName.includes("team") || variantName.includes("team")) {
      newPlan = "team";
    }

    if (eventName === "subscription_created" || eventName === "subscription_updated" || eventName === "subscription_resumed") {
      const status = payload.data?.attributes?.status || "active";
      const planToSet = status === "active" || status === "on_trial" ? newPlan : "free";

      await supabaseAdmin
        .from("profiles")
        .update({
          plan: planToSet,
          lemonsqueezy_customer_id: customerId,
          lemonsqueezy_subscription_id: subscriptionId,
          subscription_status: status,
        })
        .eq("id", userId);

      console.log(`[LemonSqueezy Webhook] Updated user ${userId} plan to: ${planToSet}`);
    } else if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
          subscription_status: "cancelled",
        })
        .eq("id", userId);

      console.log(`[LemonSqueezy Webhook] Downgraded user ${userId} to free plan`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[LemonSqueezy Webhook] Error processing event:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
