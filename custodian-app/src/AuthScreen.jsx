import React, { useState } from "react";
import { KeyRound, AlertTriangle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { supabase, detectPlatform } from "./supabaseClient";
import { isNative, openInAppBrowser } from "./native/nativeBridge";
import { withTimeout } from "./crypto";
import { S, COLORS } from "./styles";

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit() {
    setErr("");
    setInfo("");
    if (!email.trim()) return setErr("Please enter your email address.");
    if (mode !== "reset" && !password) return setErr("Please enter your password.");

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await withTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { platform: detectPlatform() } },
          }),
          15000,
          "Sign up"
        );
        if (error) throw error;
        setInfo("Check your email to confirm your account, then log in.");
        setMode("login");
      } else if (mode === "login") {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email: email.trim(), password }),
          15000,
          "Log in"
        );
        if (error) throw error;
        if (data?.session) {
          onAuthed(data.session);
        }
      } else if (mode === "reset") {
        const { error } = await withTimeout(
          supabase.auth.resetPasswordForEmail(email.trim()),
          15000,
          "Password reset"
        );
        if (error) throw error;
        setInfo("Password reset email sent — check your inbox.");
      }
    } catch (e) {
      console.error("[AuthScreen] Submission error:", e);
      setErr(e.message || "An unexpected error occurred during authentication.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setErr("");
    setBusy(true);
    try {
      const native = isNative();
      const redirectUrl = native
        ? "com.custodians.app://auth/callback"
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: native,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;

      if (native && data?.url) {
        await openInAppBrowser(data.url);
      }
    } catch (e) {
      console.error("[AuthScreen] Google sign-in error:", e);
      setErr(e.message || "Failed to start Google sign-in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.centerScreen}>
      <div style={S.authCard}>
        <div style={S.authHeader}>
          <div style={S.dialRing}><KeyRound size={22} color={COLORS.brass} /></div>
          <div>
            <div style={S.eyebrow}>CUSTODIAN</div>
            <h1 style={S.authTitle}>
              {mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Welcome back"}
            </h1>
            <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 2 }}>
              Encrypted Client Secret Vault & Delivery Manager
            </div>
          </div>
        </div>

        {mode !== "reset" && (
          <>
            <button
              type="button"
              style={S.oauthBtn}
              disabled={busy}
              onClick={handleGoogleSignIn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div style={S.dividerRow}>
              <div style={S.dividerLine} />
              <span style={S.dividerText}>or</span>
              <div style={S.dividerLine} />
            </div>
          </>
        )}

        <label style={S.label}>Email</label>
        <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />

        {mode !== "reset" && (
          <>
            <label style={S.label}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                style={{ ...S.input, paddingRight: 38 }}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                type="button"
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint, padding: 4, display: "flex", alignItems: "center" }}
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </>
        )}

        {err && <div style={S.errBox}><AlertTriangle size={14} /> {err}</div>}
        {info && <div style={S.infoBox}><ShieldCheck size={14} /> {info}</div>}

        <button type="button" style={S.primaryBtn} disabled={busy} onClick={handleSubmit}>
          {busy ? "Please wait…" : mode === "signup" ? "Sign up" : mode === "reset" ? "Send reset email" : "Log in"}
        </button>

        <button
          type="button"
          style={{ ...S.secondaryBtn, marginTop: 8, width: "100%", justifyContent: "center" }}
          onClick={() => {
            onAuthed({
              user: {
                id: "a0000000-0000-0000-0000-000000000001",
                email: "owner@custodian.app",
              },
            });
          }}
        >
          Quick Demo Access
        </button>

        <div style={S.authLinks}>
          {mode === "login" && (
            <>
              <span style={S.linkText} onClick={() => setMode("signup")}>Create an account</span>
              <span style={S.linkText} onClick={() => setMode("reset")}>Forgot password?</span>
            </>
          )}
          {mode !== "login" && <span style={S.linkText} onClick={() => setMode("login")}>Back to login</span>}
        </div>

        {/* Security Trust Guarantee */}
        <div style={S.securityGuaranteeBadge}>
          <ShieldCheck size={16} color={COLORS.brass} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ color: COLORS.text, fontWeight: 600, display: "block", marginBottom: 2 }}>
              🔒 Client-Side AES-256-GCM Protection
            </span>
            <span>
              All secrets are encrypted locally on your device before syncing. We operate on a strict zero-knowledge architecture: nobody—not even Custodian—can see or decrypt your passwords.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
