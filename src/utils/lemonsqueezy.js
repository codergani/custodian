// Lemon Squeezy Web Billing Utility for Custodian
// Handles opening checkout sessions with prefilled user IDs for webhook reconciliation

export const LEMON_CONFIG = {
  // URLs can be configured via .env (VITE_LEMON_SQUEEZY_PRO_URL, VITE_LEMON_SQUEEZY_TEAM_URL)
  proCheckoutUrl:
    import.meta.env.VITE_LEMON_SQUEEZY_PRO_URL ||
    "https://custodian.lemonsqueezy.com/checkout/buy/b4d9982a-84ec-4bca-8072-b2c90fb1ee3f",
  teamCheckoutUrl:
    import.meta.env.VITE_LEMON_SQUEEZY_TEAM_URL ||
    "https://custodian.lemonsqueezy.com/checkout/buy/f505560d-fd6c-4ce2-a7a7-1fd3df4e6680",
};

/**
 * Dynamically loads the Lemon.js script for seamless overlay checkout if on web
 */
export function initLemonSqueezy() {
  if (typeof window === "undefined") return;
  if (window.createLemonSqueezy) {
    try {
      window.createLemonSqueezy();
    } catch {}
    return;
  }

  const script = document.createElement("script");
  script.src = "https://assets.lemonsqueezy.com/lemon.js";
  script.defer = true;
  script.onload = () => {
    if (window.createLemonSqueezy) {
      window.createLemonSqueezy();
    }
  };
  document.head.appendChild(script);
}

/**
 * Generates a checkout link passing Supabase user ID and email
 * @param {'pro'|'team'} planId
 * @param {string} userId - Supabase User UUID
 * @param {string} userEmail - User email
 * @returns {string} Fully qualified checkout URL
 */
export function getCheckoutUrl(planId, userId, userEmail = "") {
  const baseUrl = planId === "team" ? LEMON_CONFIG.teamCheckoutUrl : LEMON_CONFIG.proCheckoutUrl;
  if (!baseUrl) return "";

  const url = new URL(baseUrl);
  // Pass custom data so the Lemon Squeezy webhook knows exactly which Supabase user to upgrade
  url.searchParams.set("checkout[custom][user_id]", userId);
  if (userEmail) {
    url.searchParams.set("checkout[email]", userEmail);
  }
  // Embed parameter for Lemon.js modal overlay
  url.searchParams.set("embed", "1");
  return url.toString();
}

/**
 * Open Lemon Squeezy checkout (Overlay if supported, otherwise new tab redirect)
 */
export function openLemonCheckout(planId, userId, userEmail = "") {
  const checkoutUrl = getCheckoutUrl(planId, userId, userEmail);

  if (!checkoutUrl) {
    // If no checkout URL is configured yet in .env, return false so UI can show helpful setup message
    return false;
  }

  if (window.LemonSqueezy && typeof window.LemonSqueezy.Url?.Open === "function") {
    window.LemonSqueezy.Url.Open(checkoutUrl);
  } else {
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  }
  return true;
}
