import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

// RevenueCat Public API Keys (Configure via .env or defaults)
const REVENUECAT_ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || "goog_placeholder_api_key";
const REVENUECAT_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || "appl_placeholder_api_key";

let initialized = false;

/**
 * Initialize RevenueCat SDK on native mobile platforms
 * @param {string} appUserId - Supabase User UUID
 */
export async function initRevenueCat(appUserId) {
  if (!Capacitor.isNativePlatform() || initialized) return;

  try {
    const platform = Capacitor.getPlatform();
    const apiKey = platform === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey,
      appUserID: appUserId || undefined,
    });
    initialized = true;
    console.log("[RevenueCat] Initialized successfully for user:", appUserId);
  } catch (err) {
    console.warn("[RevenueCat] Init warning:", err);
  }
}

/**
 * Identify user after login
 */
export async function identifyUser(appUserId) {
  if (!Capacitor.isNativePlatform() || !appUserId) return;
  try {
    await Purchases.logIn({ appUserID: appUserId });
  } catch (err) {
    console.warn("[RevenueCat] Login identify warning:", err);
  }
}

/**
 * Log out user from RevenueCat on app sign out
 */
export async function resetPurchasesUser() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn("[RevenueCat] Logout warning:", err);
  }
}

/**
 * Fetch available offerings (Pro / Team packages) from Google Play
 */
export async function getRevenueCatOfferings() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings?.current || null;
  } catch (err) {
    console.warn("[RevenueCat] getOfferings warning:", err);
    return null;
  }
}

/**
 * Purchase a subscription package via Google Play In-App Billing
 * @param {'pro'|'team'} planId
 * @returns {Promise<{success: boolean, plan?: string, error?: string}>}
 */
export async function purchaseSubscriptionPackage(planId) {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: "Not on native platform" };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) {
      throw new Error("No active Google Play offerings configured in RevenueCat.");
    }

    // Match package identifier (e.g. $rc_monthly or custom identifier)
    const targetPkg = current.availablePackages.find((pkg) =>
      pkg.identifier.toLowerCase().includes(planId) ||
      pkg.product.identifier.toLowerCase().includes(planId)
    ) || current.availablePackages[0];

    if (!targetPkg) {
      throw new Error(`Package for ${planId} not found in Google Play offering.`);
    }

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: targetPkg });
    const isPro = customerInfo.entitlements.active["pro"] !== undefined;
    const isTeam = customerInfo.entitlements.active["team"] !== undefined;

    return {
      success: isPro || isTeam,
      plan: isTeam ? "team" : isPro ? "pro" : "free",
    };
  } catch (err) {
    if (err.userCancelled) {
      return { success: false, userCancelled: true };
    }
    console.error("[RevenueCat] Purchase error:", err);
    return { success: false, error: err.message || "Purchase failed" };
  }
}

/**
 * Restore previous purchases (Mandatory for Google Play & Apple App Store compliance)
 */
export async function restoreNativePurchases() {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: "Not on native mobile platform" };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active["pro"] !== undefined;
    const isTeam = customerInfo.entitlements.active["team"] !== undefined;

    return {
      success: true,
      hasActiveSubscription: isPro || isTeam,
      plan: isTeam ? "team" : isPro ? "pro" : "free",
    };
  } catch (err) {
    console.error("[RevenueCat] Restore error:", err);
    return { success: false, error: err.message || "Failed to restore purchases." };
  }
}
