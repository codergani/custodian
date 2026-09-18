import React, { useState, useEffect } from "react";
import { KeyRound, AlertTriangle, ShieldCheck, Eye, EyeOff, AtSign, User, Mail, MailCheck, ArrowLeft, RefreshCw, Send, CheckCircle2, Lock } from "lucide-react";
import { supabase, detectPlatform } from "./supabaseClient";
import { isNative, openInAppBrowser } from "./native/nativeBridge";
import { withTimeout } from "./crypto";
import { normalizeUsername, validateUsername } from "./utils/usernameValidation";
import { S, COLORS } from "./styles";

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSubmit() {
    setErr("");
    setInfo("");
    if (!email.trim()) return setErr("Please enter your email address.");
    if (mode !== "reset" && !password) return setErr("Please enter your password.");

    let validUsername = "";
    if (mode === "signup") {
      const uRes = validateUsername(username);
      if (!uRes.isValid) {
        return setErr(uRes.error);
      }
      validUsername = uRes.normalized;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await withTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                platform: detectPlatform(),
                username: validUsername,
                display_name: displayName.trim() || validUsername,
              },
            },
          }),
          15000,
          "Sign up"
        );
        if (error) throw error;

        // Also upsert profile record with username if user id exists
        if (signUpData?.user?.id) {
          try {
            await supabase.from("profiles").upsert({
              id: signUpData.user.id,
              email: email.trim(),
              username: validUsername,
              display_name: displayName.trim() || validUsername,
            });
          } catch (pErr) {
            console.warn("[AuthScreen] Profile username upsert notice:", pErr);
          }
        }

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
        const redirectUrl = isNative()
          ? "com.custodians.app://auth/callback#type=recovery"
          : window.location.origin + "/#type=recovery";

        const { error } = await withTimeout(
          supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: redirectUrl,
          }),
          15000,
          "Password reset"
        );
        if (error) throw error;
        setResetSent(true);
        setCooldown(60);
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
          <div style={S.dialRing}>
            {mode === "reset" ? <Mail size={22} color={COLORS.brass} /> : <KeyRound size={22} color={COLORS.brass} />}
          </div>
          <div>
            <div style={S.eyebrow}>{mode === "reset" ? "ACCOUNT RECOVERY" : "CUSTODIAN"}</div>
            <h1 style={S.authTitle}>
              {mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome back"}
            </h1>
            <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 2 }}>
              {mode === "reset" ? "Zero-knowledge protected account recovery" : "Encrypted Client Secret Vault & Delivery Manager"}
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

        {mode === "signup" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={S.label}>
                  <AtSign size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                  Username <span style={{ color: COLORS.brass, fontWeight: 700 }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.textFaint, fontSize: 13, fontWeight: 600 }}>
                    @
                  </span>
                  <input
                    style={{ ...S.input, paddingLeft: 26, textTransform: "lowercase" }}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                    placeholder="alex_dev"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div>
                <label style={S.label}>
                  <User size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                  Display Name
                </label>
                <input
                  style={S.input}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Developer"
                />
              </div>
            </div>
            <div style={{ fontSize: 11, color: COLORS.textDim, margin: "-4px 0 8px" }}>
              Username is unique, lowercase-only (3–20 chars). Used for zero-knowledge secret sharing.
            </div>
          </>
        )}

        {mode === "reset" && resetSent ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "10px 0" }}>
            <div style={{ ...S.dialRing, width: 54, height: 54, background: "rgba(62,207,142,0.12)", borderColor: "#3ECF8E" }}>
              <MailCheck size={26} color="#3ECF8E" />
            </div>

            <div>
              <h2 style={{ ...S.authTitle, fontSize: 18 }}>Check Your Inbox</h2>
              <div style={{ fontSize: 12.5, color: COLORS.textDim, marginTop: 4, lineHeight: 1.5 }}>
                We've dispatched a secure recovery link to:
              </div>
              <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, padding: "8px 14px", borderRadius: 8, fontFamily: "IBM Plex Mono, monospace", color: COLORS.brass, fontSize: 13, marginTop: 8, display: "inline-block" }}>
                {email.trim()}
              </div>
            </div>

            <div style={{ background: "rgba(176,141,87,0.06)", border: `1px solid ${COLORS.brassDim}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", fontSize: 12, color: COLORS.textDim, lineHeight: 1.6, width: "100%" }}>
              <div style={{ fontWeight: 600, color: COLORS.brass, marginBottom: 4 }}>Next Steps:</div>
              <div>1. Open the email from <strong>Custodian</strong>.</div>
              <div>2. Click the secure <strong>"Reset Password"</strong> link.</div>
              <div>3. You'll be returned here to create your new password.</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 4 }}>
              <button
                type="button"
                style={{ ...S.secondaryBtn, justifyContent: "center", padding: "9px 16px", fontSize: 12 }}
                disabled={busy || cooldown > 0}
                onClick={handleSubmit}
              >
                <RefreshCw size={13} className={busy ? "spin" : ""} />
                {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend Recovery Email"}
              </button>

              <button
                type="button"
                style={{ ...S.iconBtnGhost, alignSelf: "center", fontSize: 12, color: COLORS.textFaint, marginTop: 4 }}
                onClick={() => {
                  setResetSent(false);
                  setMode("login");
                }}
              >
                <ArrowLeft size={13} /> Return to Sign In
              </button>
            </div>

            <div style={{ fontSize: 11, color: COLORS.textFaint }}>
              Didn't receive it? Check your Spam or Junk folder.
            </div>
          </div>
        ) : (
          <>
            {mode === "reset" && (
              <div style={{ fontSize: 12.5, color: COLORS.textDim, marginBottom: 8, lineHeight: 1.5 }}>
                Enter your account email address. We'll send you a secure link to update your login password.
              </div>
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

            <button type="button" style={{ ...S.primaryBtn, marginTop: 4, justifyContent: "center" }} disabled={busy} onClick={handleSubmit}>
              {busy ? "Please wait…" : mode === "signup" ? "Sign up" : mode === "reset" ? "Send Recovery Link" : "Log in"}
            </button>

            {mode !== "reset" && (
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
            )}

            <div style={S.authLinks}>
              {mode === "login" && (
                <>
                  <span style={S.linkText} onClick={() => setMode("signup")}>Create an account</span>
                  <span style={S.linkText} onClick={() => setMode("reset")}>Forgot password?</span>
                </>
              )}
              {mode !== "login" && (
                <span style={{ ...S.linkText, display: "flex", alignItems: "center", gap: 4 }} onClick={() => { setMode("login"); setResetSent(false); }}>
                  <ArrowLeft size={13} /> Back to login
                </span>
              )}
            </div>
          </>
        )}

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
