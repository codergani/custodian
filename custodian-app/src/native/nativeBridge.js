import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

export function isNative() {
  return Capacitor.isNativePlatform();
}

export function getPlatform() {
  return Capacitor.getPlatform();
}

/**
 * Open external URL in Chrome Custom Tabs (Android) or SFSafariViewController (iOS)
 */
export async function openInAppBrowser(url) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: "popover" });
  } else {
    window.location.href = url;
  }
}

/**
 * Close in-app browser tab
 */
export async function closeInAppBrowser() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.close();
    } catch {
      // Browser may have already closed or was dismissed by user
    }
  }
}

/**
 * Dynamically update native status bar colors when theme changes
 */
export async function updateNativeStatusBar(theme = "light") {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const isDark = theme === "dark";
    // Style.Dark means light text (for dark bg), Style.Light means dark text (for light bg)
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: isDark ? "#171615" : "#F8F6F1" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (err) {
    console.warn("[NativeBridge] StatusBar update warning:", err);
  }
}

/**
 * Initialize native device features (status bar color, splash screen auto-dismiss).
 */
export async function initNativePlugins(initialTheme = "light") {
  if (!Capacitor.isNativePlatform()) return;

  // 1. Configure Status Bar with initial theme
  await updateNativeStatusBar(initialTheme);

  // 2. Hide Splash Screen after app hydration
  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn("[NativeBridge] SplashScreen hide warning:", err);
  }
}

// ──── Hardware Back Button Coordination ────
const backHandlers = [];

/**
 * Register a handler for the Android hardware back button.
 * @param {Function} handler - Function returning true if it consumed the back event, false otherwise.
 * @param {number} priority - Higher priority runs first.
 * @returns {Function} Unregister cleanup function.
 */
export function registerBackButtonHandler(handler, priority = 0) {
  const entry = { handler, priority };
  backHandlers.push(entry);
  backHandlers.sort((a, b) => b.priority - a.priority);
  return () => {
    const idx = backHandlers.indexOf(entry);
    if (idx !== -1) backHandlers.splice(idx, 1);
  };
}

let backButtonInitialized = false;

export function setupBackButtonListener() {
  if (!Capacitor.isNativePlatform() || backButtonInitialized) return;
  backButtonInitialized = true;

  CapApp.addListener("backButton", ({ canGoBack }) => {
    // Iterate through registered handlers from highest priority to lowest
    const handlers = [...backHandlers];
    for (const entry of handlers) {
      try {
        if (entry.handler()) {
          return; // Event consumed
        }
      } catch (err) {
        console.error("[NativeBridge] Error in backButton handler:", err);
      }
    }

    // Default: Exit/minimize app if on root view with nothing to dismiss
    CapApp.exitApp();
  });
}

// ──── Deep Link Auth Callback Listener ────
let deepLinkInitialized = false;

/**
 * Listen for app URL open events (custom scheme callbacks like com.custodians.app://auth/callback)
 * to complete Supabase OAuth or magic link authentication.
 */
export function setupDeepLinkAuthListener(supabase, onSession) {
  if (!Capacitor.isNativePlatform() || deepLinkInitialized) return;
  deepLinkInitialized = true;

  CapApp.addListener("appUrlOpen", async ({ url }) => {
    console.log("[NativeBridge] App opened with deep link URL:", url);

    // Auto-close in-app browser tab
    await closeInAppBrowser();

    if (!url || (!url.includes("com.custodians.app") && !url.includes("auth/callback"))) {
      return;
    }

    try {
      // 1. Check for hash parameters (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf("#");
      if (hashIndex !== -1) {
        const hashStr = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hashStr);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          console.log("[NativeBridge] Found tokens in deep link hash, establishing session...");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("[NativeBridge] Error setting session from deep link:", error);
          } else if (data?.session && onSession) {
            onSession(data.session);
          }
          return;
        }
      }

      // 2. Check for query parameters (?code=... for PKCE flow)
      const queryIndex = url.indexOf("?");
      if (queryIndex !== -1) {
        const queryStr = url.substring(queryIndex + 1).split("#")[0];
        const params = new URLSearchParams(queryStr);
        const code = params.get("code");

        if (code) {
          console.log("[NativeBridge] Found PKCE code in deep link, exchanging for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[NativeBridge] Error exchanging PKCE code:", error);
          } else if (data?.session && onSession) {
            onSession(data.session);
          }
          return;
        }
      }
    } catch (err) {
      console.error("[NativeBridge] Failed to handle deep link auth:", err);
    }
  });
}
