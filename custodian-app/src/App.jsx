import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { supabase } from "./supabaseClient";
import AuthScreen from "./AuthScreen";
import VaultUnlock from "./VaultUnlock";
import Vault from "./Vault";
import AdminHQ from "./AdminHQ";
import { ThemeProvider } from "./ThemeContext";
import { initNativePlugins, setupBackButtonListener, setupDeepLinkAuthListener, setupAppStateAutoLock } from "./native/nativeBridge";
import { initLemonSqueezy } from "./utils/lemonsqueezy";
import { initRevenueCat, identifyUser, resetPurchasesUser } from "./native/revenueCat";
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

  useEffect(() => {
    function handleLocationChange() {
      setRoute(window.location.hash || window.location.pathname);
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
    sessionStorage.removeItem("custodian_session_vault_key");
  }

  function handleUnlocked(key, ecdhKey) {
    // In-memory key retention during active session
    setVaultKey(key);
    if (ecdhKey) setEcdhPrivateKey(ecdhKey);
    sessionStorage.removeItem("custodian_session_vault_key");
  }

  // Initialize native mobile features, listeners, and web payment scripts
  useEffect(() => {
    initNativePlugins();
    setupBackButtonListener();
    setupDeepLinkAuthListener(supabase, setSession);
    setupAppStateAutoLock(handleLock);
    initLemonSqueezy();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data?.session?.user?.id) {
        initRevenueCat(data.session.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user?.id) {
        identifyUser(sess.user.id);
      } else {
        setProfile(null);
        setVaultKey(null);
        setEcdhPrivateKey(null);
        sessionStorage.removeItem("custodian_session_vault_key");
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
        const isFounderEmail = import.meta.env.VITE_FOUNDER_EMAIL && session.user.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase();
        let loaded = data || { id: session.user.id, email: session.user.email, role: "member" };
        if (isFounderEmail) {
          loaded = { ...loaded, plan: "founder", role: "founder" };
        }
        setProfile(loaded);
      })
      .catch((err) => {
        console.error("Profile query exception, using fallback:", err);
        const isFounderEmail = import.meta.env.VITE_FOUNDER_EMAIL && session.user.email?.toLowerCase() === import.meta.env.VITE_FOUNDER_EMAIL.toLowerCase();
        setProfile({
          id: session.user.id,
          email: session.user.email,
          role: isFounderEmail ? "founder" : "member",
          plan: isFounderEmail ? "founder" : "free",
        });
      });
  }, [session]);


  if (session === undefined) {
    return <div style={S.centerScreen}><div style={{ color: "#A8A399", fontSize: 13 }}>Loading…</div></div>;
  }
  if (!session) {
    return (
      <ErrorBoundary>
        <AuthScreen onAuthed={setSession} />
      </ErrorBoundary>
    );
  }
  if (!profile) {
    return <div style={S.centerScreen}><div style={{ color: "#A8A399", fontSize: 13 }}>Loading profile…</div></div>;
  }

  // 1. Dedicated Admin Route (/admin or #/admin) - STRICT ACCESS CONTROL
  const isAdminRoute = route.includes("admin") || window.location.hash === "#/admin" || window.location.pathname === "/admin";
  if (isAdminRoute) {
    const isAuthorized =
      profile?.role === "founder" ||
      profile?.role === "admin" ||
      profile?.plan === "founder" ||
      (import.meta.env.VITE_FOUNDER_EMAIL && session.user.email === import.meta.env.VITE_FOUNDER_EMAIL);

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
        onLock={handleLock}
        onProfileUpdate={setProfile}
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
