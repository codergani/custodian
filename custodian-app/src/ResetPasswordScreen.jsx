import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "./supabaseClient";
import { S, COLORS } from "./styles";
import { checkPasswordStrength } from "./utils/passwordGenerator";

export default function ResetPasswordScreen({ session, onComplete, onCancel }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = checkPasswordStrength(newPassword);
  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setErr("");

    if (!hasMinLength) {
      setErr("Password must be at least 8 characters long.");
      return;
    }
    if (!passwordsMatch) {
      setErr("Passwords do not match. Please verify both fields.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1800);
    } catch (e) {
      console.error("[ResetPassword] Update error:", e);
      setErr(e.message || "Failed to update password. Recovery link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  const userEmail = session?.user?.email || "your account";

  return (
    <div style={S.centerScreen}>
      <div style={{ ...S.authCard, maxWidth: 440 }}>
        <div style={S.authHeader}>
          <div style={{ ...S.dialRing, borderColor: COLORS.brass, background: "rgba(176,141,87,0.12)" }}>
            <Lock size={22} color={COLORS.brass} />
          </div>
          <div>
            <div style={S.eyebrow}>SECURITY RECOVERY</div>
            <h1 style={S.authTitle}>Set New Password</h1>
            <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 2 }}>
              Choose a strong new password for <strong>{userEmail}</strong>
            </div>
          </div>
        </div>

        {success ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 10px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(62,207,142,0.15)", border: "1.5px solid #3ECF8E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={28} color="#3ECF8E" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Password Updated!</div>
            <div style={{ fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.5, maxWidth: 320 }}>
              Your account password has been updated securely. Redirecting to your vault...
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* New Password */}
            <div>
              <label style={S.label}>New Password</label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  style={{ ...S.input, paddingRight: 38 }}
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint, padding: 4, display: "flex", alignItems: "center" }}
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                  title={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: COLORS.textFaint }}>STRENGTH</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: strength.color }}>{strength.label}</span>
                  </div>
                  <div style={{ width: "100%", height: 4, background: COLORS.line, borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${strength.percent}%`,
                        height: "100%",
                        background: strength.color,
                        transition: "all 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={S.label}>Confirm New Password</label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  style={{ ...S.input, paddingRight: 38 }}
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your new password"
                  required
                />
                <button
                  type="button"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint, padding: 4, display: "flex", alignItems: "center" }}
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  title={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Match Feedback */}
              {confirmPassword.length > 0 && (
                <div style={{ fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4, color: passwordsMatch ? "#3ECF8E" : "#E07A6D" }}>
                  {passwordsMatch ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                </div>
              )}
            </div>

            {err && (
              <div style={S.errBox}>
                <AlertTriangle size={14} /> {err}
              </div>
            )}

            <button
              type="submit"
              style={{ ...S.primaryBtn, justifyContent: "center", padding: "11px 16px" }}
              disabled={busy || !hasMinLength || !passwordsMatch}
            >
              {busy ? "Updating Password…" : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Save New Password & Continue <ArrowRight size={14} />
                </span>
              )}
            </button>

            {onCancel && (
              <button
                type="button"
                style={{ ...S.iconBtnGhost, alignSelf: "center", fontSize: 12, color: COLORS.textFaint }}
                onClick={onCancel}
                disabled={busy}
              >
                Cancel & Return to Login
              </button>
            )}

            {/* Zero-Knowledge Disclaimer */}
            <div style={{ ...S.securityGuaranteeBadge, marginTop: 6, fontSize: 11 }}>
              <ShieldCheck size={14} color={COLORS.brass} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Zero-Knowledge Reminder:</strong> This updates your account cloud credentials. Your vault remains locked with your local Master Vault Passcode.
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
