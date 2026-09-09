// Supabase Edge Function: RevenueCat Webhook Handler
// Listens for Google Play / Apple In-App Purchase events and auto-syncs public.profiles in Supabase
// Deploy with: supabase functions deploy revenuecat-webhook --no-verify-jwt

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
const REVENUECAT_WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    // 1. Verify Authorization Header (if configured in RevenueCat Dashboard)
    const authHeader = req.headers.get("Authorization") || "";
    if (REVENUECAT_WEBHOOK_AUTH && authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH}` && authHeader !== REVENUECAT_WEBHOOK_AUTH) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const event = payload.event;
    if (!event) {
      return new Response(JSON.stringify({ message: "No event payload" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id; // Supabase user UUID linked via identifyUser()
    const entitlementIds = event.entitlement_ids || (event.entitlement_id ? [event.entitlement_id] : []);

    console.log(`[RevenueCat Webhook] Received ${eventType} for user: ${appUserId}, entitlements:`, entitlementIds);

    if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
      console.warn("[RevenueCat Webhook] Anonymous or missing app_user_id, skipping database sync.");
      return new Response(JSON.stringify({ message: "Anonymous user ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine target plan from active entitlements
    let targetPlan = "free";
    if (entitlementIds.includes("team")) {
      targetPlan = "team";
    } else if (entitlementIds.includes("pro")) {
      targetPlan = "pro";
    }

    if (
      eventType === "INITIAL_PURCHASE" ||
      eventType === "RENEWAL" ||
      eventType === "PRODUCT_CHANGE" ||
      eventType === "UNCANCELLATION"
    ) {
      const planToSet = targetPlan !== "free" ? targetPlan : "pro";
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: planToSet,
          revenuecat_customer_id: event.original_app_user_id || appUserId,
          subscription_status: "active",
        })
        .eq("id", appUserId);

      console.log(`[RevenueCat Webhook] Updated user ${appUserId} plan to: ${planToSet}`);
    } else if (eventType === "CANCELLATION" || eventType === "EXPIRATION") {
      // If expired, revert to free tier
      if (eventType === "EXPIRATION") {
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: "free",
            subscription_status: "expired",
          })
          .eq("id", appUserId);

        console.log(`[RevenueCat Webhook] Reverted user ${appUserId} to free tier (expired)`);
      } else {
        // Just marked canceled, stays active until end of billing cycle
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "cancelled",
          })
          .eq("id", appUserId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[RevenueCat Webhook] Error processing event:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
