import React, { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { supabase } from "./supabaseClient";
import AuthScreen from "./AuthScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LandingPage from "./components/LandingPage";
import VaultUnlock from "./VaultUnlock";
import Vault from "./Vault";
import AdminHQ from "./AdminHQ";
import AdminSupportPanel from "./components/AdminSupportPanel";
import ResetPasswordScreen from "./ResetPasswordScreen";
import Mandatory2FASetup from "./components/Mandatory2FASetup";
import { saveRecoveryCodesToVault } from "./utils/mfaUtils";
import { ThemeProvider } from "./ThemeContext";
import { isNative, initNativePlugins, setupBackButtonListener, setupDeepLinkAuthListener, setupAppStateAutoLock } from "./native/nativeBridge";
import { initLemonSqueezy } from "./utils/lemonsqueezy";

import { initRevenueCat, identifyUser, resetPurchasesUser } from "./native/revenueCat";
import { getAutoLockMinutes } from "./security";
import {
  exportKeyRaw,
  importKeyRaw,
  deriveKey,
  newSalt,
  encryptJSON,
  decryptJSON,
  generateECDHKeyPair,
  exportPublicKeyJWK,
  exportEncryptedPrivateKey,
  importDecryptedPrivateKey,
} from "./crypto";
import { S } from "./styles";



class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Custodian Vault caught error:", error, errorInfo);
    try {
      // Clear route and navigation persistence on catch to avoid reload loops
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("custodian_nav_") || k.startsWith("custodian_last_")) {
          sessionStorage.removeItem(k);
        }
      });
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("custodian_nav_") || k.startsWith("custodian_last_")) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  }
  handleResetAndReload = () => {
    this.setState({ hasError: false, error: null });
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("custodian_nav_") || k.startsWith("custodian_last_")) {
          sessionStorage.removeItem(k);
        }
      });
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("custodian_nav_") || k.startsWith("custodian_last_")) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
    window.location.hash = "";
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={S.centerScreen}>
          <div style={{ ...S.authCard, maxWidth: 440, textAlign: "center" }}>
            <h2 style={{ ...S.authTitle, color: "#E07A6D" }}>Something went wrong</h2>
            <div style={{ fontSize: 12.5, color: "#A8A399", margin: "8px 0 14px", lineHeight: 1.5 }}>
              {this.state.error?.message || "An unexpected error occurred while rendering the vault."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                style={S.primaryBtn}
                onClick={this.handleResetAndReload}
              >
                Reset to Safe Overview & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [vaultKey, setVaultKey] = useState(null);
  const [ecdhPrivateKey, setEcdhPrivateKey] = useState(null);
  const [route, setRoute] = useState(() => window.location.hash || window.location.pathname);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    try {
      return localStorage.getItem("custodian_has_seen_welcome") === "true";
    } catch {
      return false;
    }
  });
  const [authInitialMode, setAuthInitialMode] = useState("login");
  const [isMfaEnrolled, setIsMfaEnrolled] = useState(null); // null = checking, true = enrolled, false = not enrolled
  const lastAuthPasswordRef = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsMfaEnrolled(null);
      return;
    }
    let isMounted = true;
    async function checkMfa() {
      try {
        const { data: factors, error } = await supabase.auth.mfa.listFactors();
        if (!error && factors) {
          const verified = (factors?.all || factors?.totp || []).some((f) => f.status === "verified");
          if (isMounted) setIsMfaEnrolled(Boolean(verified));
        } else {
          if (isMounted) setIsMfaEnrolled(false);
        }
      } catch (e) {
        console.warn("[App] Error checking MFA status:", e);
        if (isMounted) setIsMfaEnrolled(false);
      }
    }
    checkMfa();
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  function handleAuthed(authedSession, enteredPassword) {
    if (enteredPassword) {
      lastAuthPasswordRef.current = enteredPassword;
    }
    setSession(authedSession);
  }

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {

    return (
      window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery")
    );
  });

  useEffect(() => {
    function handleLocationChange() {
      setRoute(window.location.hash || window.location.pathname);
      if (
        window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery")
      ) {
        setIsPasswordRecovery(true);
      }
    }
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  function handleLock() {
    // Purge in-memory keys immediately on lock
    setVaultKey(null);
    setEcdhPrivateKey(null);
    try {
      sessionStorage.removeItem("custodian_session_vault_key");
      sessionStorage.removeItem("custodian_session_ecdh_key");
      sessionStorage.removeItem("custodian_session_user_id");
      sessionStorage.removeItem("custodian_session_last_active");
    } catch {}
  }

  async function handleUnlocked(key, ecdhKey) {
    // In-memory key retention during active session
    setVaultKey(key);
    if (ecdhKey) setEcdhPrivateKey(ecdhKey);
    try {
      if (session?.user?.id) {
        const rawB64 = await exportKeyRaw(key);
        sessionStorage.setItem("custodian_session_vault_key", rawB64);
        sessionStorage.setItem("custodian_session_user_id", session.user.id);
        sessionStorage.setItem("custodian_session_last_active", String(Date.now()));
        if (ecdhKey) {
          const ecdhJwk = await crypto.subtle.exportKey("jwk", ecdhKey);
          sessionStorage.setItem("custodian_session_ecdh_key", JSON.stringify(ecdhJwk));
        }
      }
    } catch (e) {
      console.warn("[App] Failed to save session vault key:", e);
    }

    // Auto-save any pending 2FA recovery codes now that vault key is unlocked
    try {
      const pendingCodes = sessionStorage.getItem("custodian_pending_2fa_vault_save");
      if (pendingCodes && (session?.user?.id || currSession?.user?.id)) {
        sessionStorage.removeItem("custodian_pending_2fa_vault_save");
        const parsed = JSON.parse(pendingCodes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const targetUid = session?.user?.id || currSession?.user?.id;
          saveRecoveryCodesToVault(targetUid, key, parsed).catch(() => {});
        }
      }
    } catch {}
  }
  async function tryAutoUnlockWithPassword(currSession, currProfile, enteredPassword) {
    if (!enteredPassword || vaultKey) return;
    try {
      const uId = currSession.user.id;
      const salt = currProfile?.vault_salt || localStorage.getItem(`demo_vault_salt_${uId}`);
      const check = currProfile?.vault_check || JSON.parse(localStorage.getItem(`demo_vault_check_${uId}`) || "null");

      if (!salt) {
        // First-time setup: automatically initialize vault with their account password
        const newVaultSalt = newSalt();
        const key = await deriveKey(enteredPassword, newVaultSalt);
        const newCheck = await encryptJSON(key, { marker: "ok" });
        const ecdhPair = await generateECDHKeyPair();
        const pubKeyJWK = await exportPublicKeyJWK(ecdhPair.publicKey);
        const encryptedPrivKey = await exportEncryptedPrivateKey(ecdhPair.privateKey, key);

        localStorage.setItem(`demo_vault_salt_${uId}`, newVaultSalt);
        localStorage.setItem(`demo_vault_check_${uId}`, JSON.stringify(newCheck));
        localStorage.setItem(`demo_vault_ecdh_pub_${uId}`, pubKeyJWK);
        localStorage.setItem(`demo_vault_ecdh_priv_${uId}`, encryptedPrivKey);

        try {
          await supabase.from("profiles").update({
            vault_salt: newVaultSalt,
            vault_check: newCheck,
            public_key: pubKeyJWK,
            encrypted_private_key: encryptedPrivKey,
          }).eq("id", uId);
        } catch (dbErr) {
          console.warn("[App] Could not save vault salt to DB:", dbErr);
        }

        currProfile.vault_salt = newVaultSalt;
        currProfile.vault_check = newCheck;
        currProfile.public_key = pubKeyJWK;
        currProfile.encrypted_private_key = encryptedPrivKey;

        await handleUnlocked(key, ecdhPair.privateKey);
      } else {
        // Existing vault: derive key with account password and verify
        const key = await deriveKey(enteredPassword, salt);
        if (check) {
          const result = await decryptJSON(key, check);
          if (result?.marker === "ok") {
            let ecdhPrivKey = null;
            const encryptedPrivKey = currProfile?.encrypted_private_key || localStorage.getItem(`demo_vault_ecdh_priv_${uId}`);
            if (encryptedPrivKey) {
              try {
                ecdhPrivKey = await importDecryptedPrivateKey(encryptedPrivKey, key);
              } catch (err) {}
            }
            if (!ecdhPrivKey) {
              const ecdhPair = await generateECDHKeyPair();
              ecdhPrivKey = ecdhPair.privateKey;
              const pubKeyJWK = await exportPublicKeyJWK(ecdhPair.publicKey);
              const newEncPrivKey = await exportEncryptedPrivateKey(ecdhPair.privateKey, key);

              localStorage.setItem(`demo_vault_ecdh_pub_${uId}`, pubKeyJWK);
              localStorage.setItem(`demo_vault_ecdh_priv_${uId}`, newEncPrivKey);

              try {
                await supabase.from("profiles").update({
                  public_key: pubKeyJWK,
                  encrypted_private_key: newEncPrivKey,
                }).eq("id", uId);
              } catch (dbErr) {
                console.warn("[App] Key migration notice:", dbErr);
              }
              if (currProfile) {
                currProfile.public_key = pubKeyJWK;
                currProfile.encrypted_private_key = newEncPrivKey;
              }
            }
            await handleUnlocked(key, ecdhPrivKey);
          }
        }
      }
    } catch (autoUnlockErr) {
      console.warn("[App] Auto-unlock with login password notice:", autoUnlockErr);
    }
  }

  async function ensureEcdhPrivateKey() {
    if (ecdhPrivateKey) return ecdhPrivateKey;
    if (!vaultKey || !session?.user?.id) return null;
    const uId = session.user.id;
    const encPriv = profile?.encrypted_private_key || localStorage.getItem(`demo_vault_ecdh_priv_${uId}`);
    if (encPriv) {
      try {
        const priv = await importDecryptedPrivateKey(encPriv, vaultKey);
        setEcdhPrivateKey(priv);
        return priv;
      } catch (e) {
        console.warn("[App] Decrypt private key error:", e);
      }
    }
    try {
      const pair = await generateECDHKeyPair();
      const pubKeyJWK = await exportPublicKeyJWK(pair.publicKey);
      const newEncPriv = await exportEncryptedPrivateKey(pair.privateKey, vaultKey);
      localStorage.setItem(`demo_vault_ecdh_pub_${uId}`, pubKeyJWK);
      localStorage.setItem(`demo_vault_ecdh_priv_${uId}`, newEncPriv);
      try {
        await supabase.from("profiles").update({
          public_key: pubKeyJWK,
          encrypted_private_key: newEncPriv,
        }).eq("id", uId);
      } catch {}
      setProfile((prev) => (prev ? { ...prev, public_key: pubKeyJWK, encrypted_private_key: newEncPriv } : prev));
      setEcdhPrivateKey(pair.privateKey);
      return pair.privateKey;
    } catch (genErr) {
      console.warn("[App] ensureEcdhPrivateKey error:", genErr);
      return null;
    }
  }


  // Restore active vault session across page refreshes if within inactivity timeout
  useEffect(() => {
    if (!session?.user?.id || vaultKey) return;

    async function restoreSessionKey() {
      try {
        const savedUserId = sessionStorage.getItem("custodian_session_user_id");
        const savedVaultKey = sessionStorage.getItem("custodian_session_vault_key");
        const savedLastActive = sessionStorage.getItem("custodian_session_last_active");

        if (!savedVaultKey || savedUserId !== session.user.id) return;

        const timeoutMinutes = getAutoLockMinutes(session.user.id);
        if (timeoutMinutes > 0 && savedLastActive) {
          const elapsedMins = (Date.now() - Number(savedLastActive)) / (1000 * 60);
          if (elapsedMins >= timeoutMinutes) {
            console.log(`[AutoLock] Inactivity expired across refresh (${Math.round(elapsedMins)}m), clearing session.`);
            handleLock();
            return;
          }
        }

        // Within timeout OR Auto-Lock is "Never" (timeoutMinutes === 0)
        const key = await importKeyRaw(savedVaultKey);
        setVaultKey(key);
        sessionStorage.setItem("custodian_session_last_active", String(Date.now()));

        const savedEcdhKey = sessionStorage.getItem("custodian_session_ecdh_key");
        if (savedEcdhKey) {
          try {
            const jwk = JSON.parse(savedEcdhKey);
            const ecdh = await crypto.subtle.importKey(
              "jwk",
              jwk,
              { name: "ECDH", namedCurve: "P-256" },
              true,
              ["deriveKey", "deriveBits"]
            );
            setEcdhPrivateKey(ecdh);
          } catch (ecdhErr) {
            console.warn("[App] Could not restore ECDH key:", ecdhErr);
          }
        }
      } catch (err) {
        console.warn("[App] Session key restoration error:", err);
      }
    }

    restoreSessionKey();
  }, [session?.user?.id, vaultKey]);

  // Initialize native mobile features, listeners, and web payment scripts
  useEffect(() => {
    initNativePlugins();
    setupBackButtonListener();
    setupDeepLinkAuthListener(supabase, setSession);
    setupAppStateAutoLock(handleLock);
    initLemonSqueezy();
  }, []);

  // Auto-Lock Inactivity & Web Visibility Controller
  useEffect(() => {
    if (!vaultKey || !session?.user?.id) return;

    const timeoutMinutes = getAutoLockMinutes(session.user.id);
    if (timeoutMinutes <= 0) return; // 0 = Never

    let timer = null;
    let lastActiveTimestamp = Date.now();

    function resetInactivityTimer() {
      lastActiveTimestamp = Date.now();
      try {
        sessionStorage.setItem("custodian_session_last_active", String(lastActiveTimestamp));
      } catch {}
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        console.log(`[AutoLock] Inactivity timeout (${timeoutMinutes}m) reached, locking vault...`);
        handleLock();
      }, timeoutMinutes * 60 * 1000);
    }

    function handleVisibilityCheck() {
      // When user returns to tab, only lock if inactivity duration was exceeded while away
      if (document.visibilityState === "visible") {
        const elapsedMinutes = (Date.now() - lastActiveTimestamp) / (1000 * 60);
        if (elapsedMinutes >= timeoutMinutes) {
          console.log(`[AutoLock] Away for ${Math.round(elapsedMinutes)}m (timeout: ${timeoutMinutes}m), locking vault...`);
          handleLock();
        } else {
          resetInactivityTimer();
        }
      }
    }

    // Start timer on mount/unlock
    resetInactivityTimer();

    // User interaction events
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityCheck);

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
      document.removeEventListener("visibilitychange", handleVisibilityCheck);
    };
  }, [vaultKey, session?.user?.id]);

  useEffect(() => {
    // Unconditionally configure RevenueCat SDK on native launch (meets store & automated check requirements)
    initRevenueCat();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data?.session?.user?.id) {
        identifyUser(data.session.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(sess);
      if (sess?.user?.id) {
        identifyUser(sess.user.id);
      } else {
        setProfile(null);
        handleLock();
        resetPurchasesUser();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        const isFounderEmail =
          (import.meta.env.VITE_FOUNDER_EMAIL && session.user.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase()) ||
          session.user.email?.toLowerCase() === "ygpksr456@gmail.com";
        const promoOverride = localStorage.getItem(`custodian_promo_override_${session.user.id}`);
        let loaded = data || { id: session.user.id, email: session.user.email, role: "member" };
        if (isFounderEmail) {
          loaded = { ...loaded, plan: "founder", role: "founder" };
        } else if (promoOverride && (promoOverride === "pro" || promoOverride === "team")) {
          loaded = { ...loaded, plan: promoOverride };
        }
        setProfile(loaded);
        if (loaded && !loaded.public_key) {
          generateECDHKeyPair().then(async (pair) => {
            const pubKeyJWK = await exportPublicKeyJWK(pair.publicKey);
            localStorage.setItem(`demo_vault_ecdh_pub_${session.user.id}`, pubKeyJWK);
            try {
              await supabase.from("profiles").update({ public_key: pubKeyJWK }).eq("id", session.user.id);
            } catch {}
            setProfile((prev) => (prev ? { ...prev, public_key: pubKeyJWK } : prev));
          }).catch(() => {});
        }
        const pendingPassword = lastAuthPasswordRef.current;
        lastAuthPasswordRef.current = null;
        if (pendingPassword) {
          tryAutoUnlockWithPassword(session, loaded, pendingPassword);
        }
      })
      .catch((err) => {
        console.error("Profile query exception, using fallback:", err);
        const isFounderEmail =
          (import.meta.env.VITE_FOUNDER_EMAIL && session.user.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase()) ||
          session.user.email?.toLowerCase() === "ygpksr456@gmail.com";
        const promoOverride = localStorage.getItem(`custodian_promo_override_${session.user.id}`);
        const activePlan = isFounderEmail ? "founder" : (promoOverride || "free");
        const fallbackProfile = {
          id: session.user.id,
          email: session.user.email,
          role: isFounderEmail ? "founder" : "member",
          plan: activePlan,
        };
        setProfile(fallbackProfile);
        const pendingPassword = lastAuthPasswordRef.current;
        lastAuthPasswordRef.current = null;
        if (pendingPassword) {
          tryAutoUnlockWithPassword(session, fallbackProfile, pendingPassword);
        }
      });
  }, [session]);


  if (session === undefined) {
    return <div style={S.centerScreen}><div style={{ color: "#A8A399", fontSize: 13 }}>Loading…</div></div>;
  }

  // Marketing Landing Page on explicit route (/welcome or #/welcome)
  const isExplicitWelcomeRoute =
    route === "/welcome" ||
    route === "#/welcome" ||
    window.location.pathname === "/welcome" ||
    window.location.hash === "#/welcome";

  if (isExplicitWelcomeRoute && session) {
    return (
      <ErrorBoundary>
        <LandingPage
          onLogin={() => {
            window.location.hash = "";
            setRoute("");
          }}
          onSignup={() => {
            window.location.hash = "";
            setRoute("");
          }}
        />
      </ErrorBoundary>
    );
  }

  if (!session) {
    // 1. First-Launch Welcome Screen (Native Mobile or explicit #/welcome-screen test route)
    const isWelcomeScreenRoute = route.includes("welcome-screen") || window.location.hash === "#/welcome-screen";
    if (isWelcomeScreenRoute || (isNative() && !hasSeenWelcome)) {
      return (
        <ErrorBoundary>
          <WelcomeScreen
            onSelect={(mode) => {
              try {
                localStorage.setItem("custodian_has_seen_welcome", "true");
              } catch {}
              setHasSeenWelcome(true);
              setAuthInitialMode(mode);
              window.location.hash = `#/${mode}`;
              setRoute(`#/${mode}`);
            }}
          />
        </ErrorBoundary>
      );
    }

    if (isNative()) {
      return (
        <ErrorBoundary>
          <AuthScreen onAuthed={handleAuthed} initialMode={authInitialMode} />
        </ErrorBoundary>
      );
    }


    // 2. Web Marketing Landing Page vs Auth Screens
    const isLoginRoute = route.includes("login") || window.location.hash === "#/login";
    const isSignupRoute = route.includes("signup") || window.location.hash === "#/signup";

    if (isLoginRoute) {
      return (
        <ErrorBoundary>
          <AuthScreen
            onAuthed={handleAuthed}
            initialMode="login"
            onBackToHome={() => {
              window.location.hash = "#/welcome";
              setRoute("#/welcome");
            }}
          />
        </ErrorBoundary>
      );
    }

    if (isSignupRoute) {
      return (
        <ErrorBoundary>
          <AuthScreen
            onAuthed={handleAuthed}
            initialMode="signup"
            onBackToHome={() => {
              window.location.hash = "#/welcome";
              setRoute("#/welcome");
            }}
          />
        </ErrorBoundary>
      );
    }

    // Default Web Public Landing Page (route / or /welcome)
    return (
      <ErrorBoundary>
        <LandingPage
          onLogin={() => {
            window.location.hash = "#/login";
            setRoute("#/login");
            setAuthInitialMode("login");
          }}
          onSignup={() => {
            window.location.hash = "#/signup";
            setRoute("#/signup");
            setAuthInitialMode("signup");
          }}
        />
      </ErrorBoundary>
    );
  }


  // Password Recovery Flow
  if (isPasswordRecovery && session) {
    return (
      <ErrorBoundary>
        <ResetPasswordScreen
          session={session}
          onComplete={() => {
            setIsPasswordRecovery(false);
            if (window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token=")) {
              window.history.replaceState(null, "", window.location.pathname);
            }
          }}
          onCancel={() => {
            setIsPasswordRecovery(false);
            if (window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token=")) {
              window.history.replaceState(null, "", window.location.pathname);
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  if (!profile) {
    return <div style={S.centerScreen}><div style={{ color: "#A8A399", fontSize: 13 }}>Loading profile…</div></div>;
  }

  // 1. Dedicated Admin Route (/admin or #/admin) - STRICT ACCESS CONTROL
  const isAdminRoute =
    !route.includes("support") &&
    (route.includes("admin") || window.location.hash === "#/admin" || window.location.pathname === "/admin");

  if (isAdminRoute) {
    const isAuthorized =
      profile?.role === "founder" ||
      profile?.role === "admin" ||
      profile?.plan === "founder" ||
      (import.meta.env.VITE_FOUNDER_EMAIL && session.user.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase()) ||
      session.user.email?.toLowerCase() === "ygpksr456@gmail.com";

    if (!isAuthorized) {
      return (
        <div style={S.centerScreen}>
          <div style={{ ...S.authCard, maxWidth: 460, textAlign: "center" }}>
            <div style={{ ...S.dialRing, margin: "0 auto 12px", background: "rgba(224,122,109,0.12)", borderColor: "#E07A6D" }}>
              <Lock size={22} color="#E07A6D" />
            </div>
            <h2 style={{ ...S.authTitle, color: "#E07A6D", fontSize: 18 }}>Access Denied (403)</h2>
            <p style={{ ...S.authSub, fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 16px" }}>
              The Founder Control Room is strictly restricted to platform creators and administrators. Your account (<strong>{session.user.email}</strong>) does not have founder privileges.
            </p>
            <button
              style={{ ...S.primaryBtn, justifyContent: "center" }}
              onClick={() => {
                window.location.hash = "";
                setRoute("");
              }}
            >
              Return to Your Vault
            </button>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <AdminHQ
          currentUser={session.user}
          profile={profile}
          onExit={() => {
            window.location.hash = "";
            setRoute("");
          }}
        />
      </ErrorBoundary>
    );
  }

  // 2. Dedicated Founder Support Desk Route (/support, #/support, /admin-support, #/admin-support)
  const isSupportRoute =
    route.includes("support") ||
    window.location.hash === "#/support" ||
    window.location.hash === "#/admin-support" ||
    window.location.pathname === "/support" ||
    window.location.pathname === "/admin-support";

  if (isSupportRoute) {
    const isAuthorized =
      profile?.role === "founder" ||
      profile?.role === "admin" ||
      profile?.plan === "founder" ||
      (import.meta.env.VITE_FOUNDER_EMAIL && session.user.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase()) ||
      session.user.email?.toLowerCase() === "ygpksr456@gmail.com";

    if (!isAuthorized) {
      return (
        <div style={S.centerScreen}>
          <div style={{ ...S.authCard, maxWidth: 460, textAlign: "center" }}>
            <div style={{ ...S.dialRing, margin: "0 auto 12px", background: "rgba(224,122,109,0.12)", borderColor: "#E07A6D" }}>
              <Lock size={22} color="#E07A6D" />
            </div>
            <h2 style={{ ...S.authTitle, color: "#E07A6D", fontSize: 18 }}>Access Denied (403)</h2>
            <p style={{ ...S.authSub, fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 16px" }}>
              The Founder Support Desk is strictly restricted to platform creators. Your account (<strong>{session.user.email}</strong>) does not have founder privileges.
            </p>
            <button
              style={{ ...S.primaryBtn, justifyContent: "center" }}
              onClick={() => {
                window.location.hash = "";
                setRoute("");
              }}
            >
              Return to Your Vault
            </button>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <AdminSupportPanel
          currentUser={session.user}
          profile={profile}
          onExit={() => {
            window.location.hash = "";
            setRoute("");
          }}
        />
      </ErrorBoundary>
    );
  }

  const isFounderUser =
    profile?.role === "founder" ||
    profile?.role === "admin" ||
    profile?.plan === "founder" ||
    (import.meta.env.VITE_FOUNDER_EMAIL && session?.user?.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase()) ||
    session?.user?.email?.toLowerCase() === "ygpksr456@gmail.com";

  const isProOrTeam =
    isFounderUser ||
    profile?.plan === "pro" ||
    profile?.plan === "team";

  const isDemoUser =
    session?.user?.id === "a0000000-0000-0000-0000-000000000001" ||
    session?.user?.email === "owner@custodian.app";

  // 2FA is optional: users can enable/disable TOTP in Profile Settings, vault access protected by Zero-Knowledge Master Password

  if (!vaultKey) {
    return (
      <ErrorBoundary>
        <VaultUnlock userId={session.user.id} profile={profile} onUnlocked={handleUnlocked} />
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <Vault
        userId={session.user.id}
        profile={profile}
        vaultKey={vaultKey}
        ecdhPrivateKey={ecdhPrivateKey}
        ensureEcdhPrivateKey={ensureEcdhPrivateKey}
        onLock={handleLock}
        onProfileUpdate={setProfile}
        isMfaEnrolled={isMfaEnrolled}
        onMfaEnrolled={() => setIsMfaEnrolled(true)}
      />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
