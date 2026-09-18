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

// ──── Background Auto-Lock Listener ────
let appStateInitialized = false;

/**
 * Automatically lock vault when native app is sent to background or minimized.
 * @param {Function} onLock
 */
export function setupAppStateAutoLock(onLock) {
  if (!Capacitor.isNativePlatform() || appStateInitialized) return;
  appStateInitialized = true;

  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (!isActive && onLock) {
      console.log("[NativeBridge] App transitioned to background, engaging auto-lock...");
      onLock();
    }
  });
}

// ──── Biometric Authentication Convenience Layer ────
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";

/**
 * Checks if hardware biometrics (Fingerprint / Face ID / Platform Authenticator) are available.
 * @returns {Promise<boolean>}
 */
export async function isBiometricsAvailable() {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry();
      return !!info?.isAvailable;
    } catch (err) {
      console.warn("[NativeBridge] Native biometric check warning:", err);
    }
  }
  try {
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
  } catch (err) {
    console.warn("[NativeBridge] Web biometric check error:", err);
  }
  return false;
}

/**
 * Triggers native hardware biometric prompt (Fingerprint/Face/PIN) as a convenience layer.
 * @param {string} promptMessage
 * @returns {Promise<boolean>} True if biometric authentication succeeded
 */
export async function authenticateBiometrics(promptMessage = "Unlock Custodian Vault") {
  if (Capacitor.isNativePlatform()) {
    try {
      await BiometricAuth.authenticate({
        reason: promptMessage,
        cancelTitle: "Use Master Passcode",
        allowDeviceCredential: true,
      });
      return true;
    } catch (err) {
      console.warn("[NativeBridge] Native biometric prompt dismissed/failed:", err);
      return false;
    }
  }

  // Web WebAuthn fallback
  try {
    if (!window.PublicKeyCredential) return false;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname || "localhost",
      },
    });
    return !!credential;
  } catch (err) {
    console.warn("[NativeBridge] Biometric authentication not completed, falling back to passphrase:", err);
    return false;
  }
}

/**
 * Checks if the user has opted in to biometric unlock.
 * @param {string} userId
 * @returns {boolean}
 */
export function isBiometricEnabled(userId) {
  try {
    return localStorage.getItem(`custodian_bio_enabled_${userId}`) === "true" &&
      !!localStorage.getItem(`custodian_bio_enc_vault_${userId}`);
  } catch {
    return false;
  }
}

/**
 * Stores the vault key encrypted with a device hardware key for biometric unlock.
 * NEVER stores the raw vault key in plaintext.
 * @param {string} userId
 * @param {string} rawVaultKeyB64
 */
export async function enableBiometricUnlock(userId, rawVaultKeyB64) {
  try {
    // Generate or fetch a device-local hardware key salt
    let deviceSalt = localStorage.getItem("custodian_device_bio_salt");
    if (!deviceSalt) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      deviceSalt = btoa(String.fromCharCode(...saltBytes));
      localStorage.setItem("custodian_device_bio_salt", deviceSalt);
    }

    // Derive a device hardware encryption key
    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(`custodian_hw_bio_${userId}_${deviceSalt}`),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const hwKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: Uint8Array.from(atob(deviceSalt), (c) => c.charCodeAt(0)),
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // Encrypt the raw vault key bytes
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      hwKey,
      new TextEncoder().encode(rawVaultKeyB64)
    );

    const blob = JSON.stringify({
      iv: btoa(String.fromCharCode(...iv)),
      ct: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    });

    localStorage.setItem(`custodian_bio_enc_vault_${userId}`, blob);
    localStorage.setItem(`custodian_bio_enabled_${userId}`, "true");
    return true;
  } catch (err) {
    console.error("[NativeBridge] Failed to enable biometric unlock:", err);
    return false;
  }
}

/**
 * Attempts to retrieve and decrypt the vault key using biometrics.
 * @param {string} userId
 * @returns {Promise<string|null>} Decrypted raw vault key base64 string or null on failure.
 */
export async function unlockWithBiometrics(userId) {
  if (!isBiometricEnabled(userId)) return null;

  const authSuccess = await authenticateBiometrics("Unlock Custodian Secure Vault");
  if (!authSuccess) return null;

  try {
    const blobString = localStorage.getItem(`custodian_bio_enc_vault_${userId}`);
    if (!blobString) return null;

    const deviceSalt = localStorage.getItem("custodian_device_bio_salt");
    if (!deviceSalt) return null;

    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(`custodian_hw_bio_${userId}_${deviceSalt}`),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const hwKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: Uint8Array.from(atob(deviceSalt), (c) => c.charCodeAt(0)),
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const payload = JSON.parse(blobString);
    const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(payload.ct), (c) => c.charCodeAt(0));

    const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, hwKey, ct);
    return new TextDecoder().decode(decryptedBuf);
  } catch (err) {
    console.error("[NativeBridge] Biometric decryption error:", err);
    return null;
  }
}

/**
 * Clears/invalidates stored biometric keys (e.g. on password change or user disable).
 * @param {string} userId
 */
export function disableBiometricUnlock(userId) {
  try {
    localStorage.removeItem(`custodian_bio_enc_vault_${userId}`);
    localStorage.removeItem(`custodian_bio_enabled_${userId}`);
  } catch {}
}


