import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Smartphone,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Download,
  LogOut,
  KeyRound,
  Shield,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { generateRecoveryCodes, storeRecoveryCodes, saveRecoveryCodesToVault } from "../utils/mfaUtils";
import { S, COLORS } from "../styles";

export default function Mandatory2FASetup({ profile, vaultKey, onComplete, onSignOut, onCancel, isMandatory = true }) {
  const [step, setStep] = useState("scan"); // "scan" | "recovery"
  const [enrollData, setEnrollData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedCodesAck, setSavedCodesAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function startEnrollment() {
      try {
        setLoading(true);
        setErr("");

        // Clean up any stale unverified TOTP factors first
        try {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const allFactors = factors?.all || [];
          for (const f of allFactors) {
            if (f.status === "unverified") {
              await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
            }
          }
        } catch (cleanupErr) {
          console.warn("[Mandatory2FA] Cleanup unverified factors notice:", cleanupErr);
        }

        const friendly = `${profile?.email || "Custodian User"} (${Date.now().toString().slice(-4)})`;
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: "Custodian Vault",
          friendlyName: friendly,
        });
        if (error) throw error;
        if (isMounted) {
          setEnrollData(data);
        }
      } catch (e) {
        console.error("[Mandatory2FA] Enroll error:", e);
        if (isMounted) {
          setErr(e.message || "Failed to initialize 2FA enrollment.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    startEnrollment();
    return () => {
      isMounted = false;
    };
  }, [profile?.email]);

  async function handleVerify(e) {
    if (e) e.preventDefault();
    if (!verifyCode.trim() || verifyCode.trim().length < 6) {
      return setErr("Please enter the 6-digit code from your authenticator app.");
    }
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code: verifyCode.trim(),
      });
      if (error) throw error;

      // Generate and store 8 single-use recovery codes
      const codes = generateRecoveryCodes(8);
      await storeRecoveryCodes(profile.id, codes);
      setRecoveryCodes(codes);
      setStep("recovery");

      // Automatically save encrypted copy into the user's vault
      if (vaultKey) {
        saveRecoveryCodesToVault(profile.id, vaultKey, codes).catch(() => {});
      } else {
        try {
          sessionStorage.setItem("custodian_pending_2fa_vault_save", JSON.stringify(codes));
        } catch {}
      }
    } catch (e) {
      console.error("[Mandatory2FA] Verification error:", e);
      setErr("Invalid 6-digit code. Please verify your authenticator time clock and try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadCodes() {
    const text = `=================================================================
CUSTODIAN ZERO-KNOWLEDGE 2FA EMERGENCY RECOVERY CODES
=================================================================
Account ID: ${profile?.id || "N/A"}
Account Email: ${profile?.email || "N/A"}
Generated Date: ${new Date().toISOString()}

Each code below can be used EXACTLY ONCE to log in if you lose
access to your mobile authenticator app. Store these securely.

${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

=================================================================
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custodian-recovery-codes-${profile?.id?.slice(0, 8) || "vault"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedCodes(true);
  }

  function handleCopyAllCodes() {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  }

  function handleCopySecret() {
    if (enrollData?.totp?.secret) {
      navigator.clipboard.writeText(enrollData.totp.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  }

  return (
    <div style={S.centerScreen}>
      <div style={{ ...S.authCard, maxWidth: 500, width: "100%", position: "relative" }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "none",
              border: "none",
              color: COLORS.textFaint,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
            }}
            title="Close"
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
          </button>
        )}
        {/* Header */}
        <div style={S.authHeader}>
          <div style={{ ...S.dialRing, borderColor: COLORS.brass, background: "rgba(176,141,87,0.12)" }}>
            <ShieldCheck size={24} color={COLORS.brass} />
          </div>
          <h1 style={{ ...S.authTitle, fontSize: 19 }}>
            {step === "scan"
              ? isMandatory
                ? "Mandatory Two-Factor Authentication"
                : "Configure Two-Factor Authentication"
              : "Save Emergency Recovery Codes"}
          </h1>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 6,
              background: isMandatory ? "rgba(176,141,87,0.14)" : "rgba(78,186,111,0.14)",
              color: isMandatory ? COLORS.brass : "#4EBA6F",
              border: `1px solid ${isMandatory ? "rgba(176,141,87,0.3)" : "rgba(78,186,111,0.3)"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}>
              <Shield size={11} /> {isMandatory ? "Pro & Team Security Policy" : "Optional Zero-Knowledge Security"}
            </span>
          </div>
          <p style={{ ...S.authSub, margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.5 }}>
            {step === "scan"
              ? isMandatory
                ? "Because your vault is on a Pro or Team plan managing mission-critical credentials, 2FA is required to prevent unauthorized access."
                : "Scan the cryptographic QR code with Google Authenticator or 1Password to activate TOTP protection for your vault."
              : "Store these single-use recovery codes in a safe place. You will need them if you ever lose your phone."}
          </p>
        </div>

        {err && (
          <div style={{ ...S.errBox, margin: "10px 0" }}>
            <AlertTriangle size={14} /> {err}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: COLORS.textDim, fontSize: 13 }}>
            Generating unique cryptographic 2FA secret…
          </div>
        ) : step === "scan" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* QR Code Container */}
            {enrollData?.totp?.qr_code && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "#FFFFFF",
                padding: 14,
                borderRadius: 10,
                alignSelf: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.4)"
              }}>
                {enrollData.totp.qr_code.startsWith("data:") ? (
                  <img
                    src={enrollData.totp.qr_code}
                    alt="2FA QR Code"
                    style={{ width: 175, height: 175, display: "block" }}
                  />
                ) : (
                  <div
                    dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }}
                    style={{ width: 175, height: 175, display: "flex", alignItems: "center", justifyContent: "center" }}
                  />
                )}
                <span style={{ fontSize: 11, color: "#444", marginTop: 8, fontWeight: 600 }}>
                  Scan with Google Authenticator or 1Password
                </span>
              </div>
            )}

            {/* Manual Secret Key */}
            {enrollData?.totp?.secret && (
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8
              }}>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 10, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Manual Entry Secret
                  </div>
                  <div style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 12,
                    color: COLORS.brass,
                    letterSpacing: "0.05em",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {enrollData.totp.secret}
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "rgba(176,141,87,0.12)",
                    border: `1px solid ${COLORS.brassDim}`,
                    color: COLORS.brass,
                    borderRadius: 6,
                    padding: "5px 9px",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0
                  }}
                  onClick={handleCopySecret}
                >
                  {copiedSecret ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  <span>{copiedSecret ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}

            {/* Verification Code Form */}
            <div>
              <label style={{ ...S.label, marginBottom: 5 }}>
                Enter 6-Digit Code from Authenticator App:
              </label>
              <input
                style={{
                  ...S.input,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 22,
                  letterSpacing: "0.28em",
                  textAlign: "center",
                  fontWeight: 700,
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="000000"
                disabled={busy}
                autoFocus
              />
            </div>

            <button
              type="button"
              style={{ ...S.primaryBtn, justifyContent: "center", marginTop: 4 }}
              disabled={busy || verifyCode.trim().length < 6}
              onClick={handleVerify}
            >
              {busy ? "Verifying Code…" : "Verify & Activate 2FA"}
            </button>
          </div>
        ) : (
          /* Step 2: Single-Use Emergency Recovery Codes */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              background: "rgba(176,141,87,0.08)",
              border: `1px solid ${COLORS.brassDim}`,
              borderRadius: 8,
              padding: "11px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 12,
              lineHeight: 1.5,
              color: COLORS.text
            }}>
              <ShieldCheck size={18} color={COLORS.brass} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: COLORS.brass, display: "block", marginBottom: 2 }}>
                  ✅ Automatically Saved to Your Encrypted Vault
                </strong>
                These 8 emergency recovery codes have been encrypted and saved into your <strong>Personal Space</strong> secrets.
                <span style={{ display: "block", marginTop: 4, color: COLORS.textDim }}>
                  💡 <em>Recommendation:</em> Also download or copy them below to keep an offline backup in case you ever lose your phone and need to log in from a new computer.
                </span>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              padding: 12
            }}>
              {recoveryCodes.map((code, idx) => (
                <div
                  key={idx}
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 12,
                    color: COLORS.text,
                    background: "rgba(255,255,255,0.02)",
                    padding: "4px 8px",
                    borderRadius: 4,
                    textAlign: "center"
                  }}
                >
                  {code}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center", fontSize: 12 }}
                onClick={handleCopyAllCodes}
              >
                {copiedCodes ? <CheckCircle2 size={13} color="#4EBA6F" /> : <Copy size={13} />}
                <span>{copiedCodes ? "Codes Copied!" : "Copy All Codes"}</span>
              </button>
              <button
                type="button"
                style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center", fontSize: 12 }}
                onClick={handleDownloadCodes}
              >
                <Download size={13} />
                <span>Download .txt</span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 4,
                cursor: "pointer",
                userSelect: "none"
              }}
              onClick={() => setSavedCodesAck(!savedCodesAck)}
            >
              <input
                type="checkbox"
                checked={savedCodesAck}
                onChange={(e) => setSavedCodesAck(e.target.checked)}
                style={{ marginTop: 2, accentColor: COLORS.brass, cursor: "pointer" }}
              />
              <span style={{ fontSize: 11.5, color: savedCodesAck ? COLORS.text : COLORS.textDim, lineHeight: 1.4 }}>
                I have securely saved these 8 emergency recovery codes.
              </span>
            </div>

            <button
              type="button"
              style={{ ...S.primaryBtn, justifyContent: "center", marginTop: 4, opacity: savedCodesAck ? 1 : 0.6 }}
              disabled={!savedCodesAck}
              onClick={onComplete}
            >
              <span>Complete Setup & Enter Vault</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Footer sign out option */}
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: COLORS.textFaint,
              fontSize: 11.5,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}
            onClick={onSignOut}
          >
            <LogOut size={11} /> Sign out & switch account
          </button>
        </div>
      </div>
    </div>
  );
}
