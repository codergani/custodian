// Supabase Edge Function: PayPal Webhook Handler
// Listens for PayPal Subscription and Order events to automatically update user plans in public.profiles
// Deploy with: supabase functions deploy paypal-webhook --no-verify-jwt

import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_ENV") === "sandbox" 
  ? "https://api-m.sandbox.paypal.com" 
  : "https://api-m.paypal.com";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Gets OAuth2 access token from PayPal to verify webhooks or orders
 */
async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) return "";
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.access_token || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const rawBody = await req.text();
    const headers = req.headers;
    const payload = JSON.parse(rawBody);

    const eventType = payload.event_type;
    const resource = payload.resource;

    console.log(`[PayPal Webhook] Received event: ${eventType}`);

    // Optional webhook signature verification if PAYPAL_WEBHOOK_ID is set
    if (PAYPAL_WEBHOOK_ID && PAYPAL_CLIENT_SECRET) {
      const accessToken = await getPayPalAccessToken();
      if (accessToken) {
        const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            auth_algo: headers.get("paypal-auth-algo"),
            cert_url: headers.get("paypal-cert-url"),
            transmission_id: headers.get("paypal-transmission-id"),
            transmission_sig: headers.get("paypal-transmission-sig"),
            transmission_time: headers.get("paypal-transmission-time"),
            webhook_id: PAYPAL_WEBHOOK_ID,
            webhook_event: payload,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.verification_status !== "SUCCESS") {
          console.warn("[PayPal Webhook] Signature verification failed");
          return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
        }
      }
    }

    // Extract custom_id (Supabase User UUID)
    // PayPal allows custom_id in order and subscription units
    const customId = resource.custom_id || resource.custom || resource.subscriber?.custom_id || "";

    if (!customId) {
      console.log("[PayPal Webhook] Event does not carry custom_id user reference, logged.");
      return new Response(JSON.stringify({ message: "Processed without user id" }), { status: 200 });
    }

    let planToSet = "free";
    const planId = resource.plan_id || "";
    const description = (resource.description || resource.note || "").toLowerCase();

    // Map PayPal plan/description to Custodian plan
    if (description.includes("team") || planId.toLowerCase().includes("team")) {
      planToSet = "team";
    } else {
      planToSet = "pro";
    }

    switch (eventType) {
      // 1. Subscription Activated / Created / Payment Captured
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
      case "PAYMENT.SALE.COMPLETED":
      case "CHECKOUT.ORDER.APPROVED": {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            plan: planToSet,
            paypal_subscription_id: resource.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customId);

        if (error) {
          console.error(`[PayPal Webhook] Error updating profile for user ${customId}:`, error);
        } else {
          console.log(`[PayPal Webhook] Successfully upgraded user ${customId} to ${planToSet}`);
        }
        break;
      }

      // 2. Subscription Cancelled / Expired / Suspended
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            plan: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("id", customId);

        if (error) {
          console.error(`[PayPal Webhook] Error downgrading user ${customId}:`, error);
        } else {
          console.log(`[PayPal Webhook] Downgraded user ${customId} to free`);
        }
        break;
      }

      default:
        console.log(`[PayPal Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[PayPal Webhook] Handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

