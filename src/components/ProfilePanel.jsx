import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles, AlertTriangle, ShieldCheck, LogOut, Bell, Check, Sun, Moon, Trash2, Clock, Lock, Crown, Zap, ShieldAlert, Fingerprint,
  Eye, EyeOff, KeyRound, CheckCircle2, LifeBuoy, MessageSquare, Send, RefreshCw, Mail, Smartphone, Download, Copy, ExternalLink, Shield, FileText
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { S, COLORS } from "../styles";
import { CustomDropdown, ToggleSwitch, ConfirmModal, PromptModal, Overlay } from "./shared";
import { getAutoLockMinutes, setAutoLockMinutes, AUTOLOCK_OPTIONS } from "../security";
import { isBiometricsAvailable, isBiometricEnabled, enableBiometricUnlock, disableBiometricUnlock, isNative, openInAppBrowser } from "../native/nativeBridge";
import { exportKeyRaw } from "../crypto";
import { checkPasswordStrength } from "../utils/passwordGenerator";
import { generateRecoveryCodes, storeRecoveryCodes, purgeRecoveryCodes } from "../utils/mfaUtils";

export default function ProfilePanel({
  profile,
  defaultCurrency,
  vaultKey,
  onSetCurrency,
  onSignedOut,
  onOpenUpgrade,
  onCancelSubscription,
  theme = "light",
  toggleTheme,
  onSetAutoLock,
}) {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Biometric convenience toggle
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(() => isBiometricEnabled(profile?.id));
  const [bioMsg, setBioMsg] = useState("");
  const [bioErr, setBioErr] = useState("");

  useEffect(() => {
    isBiometricsAvailable().then((avail) => {
      setBioAvailable(avail);
    });
  }, []);

  async function handleToggleBiometric(enable) {
    setBioMsg("");
    setBioErr("");
    if (enable) {
      if (!vaultKey) {
        setBioErr("Vault key not held in active memory. Please unlock vault first.");
        return;
      }
      try {
        const rawKeyB64 = await exportKeyRaw(vaultKey);
        const ok = await enableBiometricUnlock(profile?.id, rawKeyB64);
        if (ok) {
          setBioEnabled(true);
          setBioMsg("Biometric unlock enabled securely for this device.");
          setTimeout(() => setBioMsg(""), 3000);
        } else {
          setBioErr("Could not enable biometric key binding on this device.");
        }
      } catch (e) {
        setBioErr("Biometric enrollment error: " + e.message);
      }
    } else {
      disableBiometricUnlock(profile?.id);
      setBioEnabled(false);
      setBioMsg("Biometric unlock disabled.");
      setTimeout(() => setBioMsg(""), 3000);
    }
  }

  // Auto-lock inactivity preference
  const [autoLockMins, setLocalAutoLockMins] = useState(() => getAutoLockMinutes(profile?.id));
  const [autoLockSaved, setAutoLockSaved] = useState(false);

  function handleAutoLockChange(val) {
    const mins = Number(val);
    setLocalAutoLockMins(mins);
    setAutoLockMinutes(profile?.id, mins);
    if (onSetAutoLock) onSetAutoLock(mins);
    setAutoLockSaved(true);
    setTimeout(() => setAutoLockSaved(false), 2000);
  }

  // Notification preferences (saved to profile / localStorage)
  const [notifyEmail, setNotifyEmail] = useState(() => {
    const saved = localStorage.getItem("custodian_notify_email");
    return saved !== null ? JSON.parse(saved) : (profile?.notify_renewal_email ?? true);
  });
  const [notifyDays, setNotifyDays] = useState(() => {
    const saved = localStorage.getItem("custodian_notify_days");
    return saved ? Number(saved) : (profile?.notify_renewal_days ?? 7);
  });
  const [notifSaved, setNotifSaved] = useState(false);

  function handleToggleNotify(val) {
    setNotifyEmail(val);
    localStorage.setItem("custodian_notify_email", JSON.stringify(val));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
    // Persist to Supabase if column exists
    if (profile?.id) {
      supabase.from("profiles").update({ notify_renewal_email: val }).eq("id", profile.id).catch(() => {});
    }
  }

  function handleChangeNotifyDays(days) {
    setNotifyDays(days);
    localStorage.setItem("custodian_notify_days", String(days));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
    if (profile?.id) {
      supabase.from("profiles").update({ notify_renewal_days: days }).eq("id", profile.id).catch(() => {});
    }
  }

  const strength = checkPasswordStrength(newPw);
  const isMatching = Boolean(newPw && confirmPw && newPw === confirmPw);

  async function changePassword() {
    setErr(""); setMsg("");
    if (!newPw) return setErr("Please enter a new password.");
    if (newPw.length < 8) return setErr("Password must be at least 8 characters.");
    if (newPw !== confirmPw) return setErr("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setErr(error.message);
    } else {
      // Invalidate stored biometric key so it requires re-setup
      disableBiometricUnlock(profile?.id);
      setBioEnabled(false);
      setMsg("Password updated successfully. Biometric unlock invalidated for security & requires re-setup.");
      setNewPw("");
      setConfirmPw("");
    }
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  // 2FA TOTP State
  const [is2FAActive, setIs2FAActive] = useState(false);
  const [mfaFactor, setMfaFactor] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showMfaEnrollModal, setShowMfaEnrollModal] = useState(false);
  const [showMfaDisableModal, setShowMfaDisableModal] = useState(false);
  const [enrollData, setEnrollData] = useState(null);
  const [enrollStep, setEnrollStep] = useState("scan"); // "scan" | "recovery"
  const [verifyCode, setVerifyCode] = useState("");
  const [generatedRecoveryCodes, setGeneratedRecoveryCodes] = useState([]);
  const [mfaErr, setMfaErr] = useState("");
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState("");
  const [disablePw, setDisablePw] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Reviewer / Judge Promo Code State
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [promoErr, setPromoErr] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const loadMfaStatus = useCallback(async () => {
    try {
      setMfaLoading(true);
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (!error && factors) {
        const verified = factors?.totp?.find((f) => f.status === "verified");
        setIs2FAActive(Boolean(verified));
        setMfaFactor(verified || null);
      }
    } catch (e) {
      console.warn("[ProfilePanel] Error checking MFA status:", e);
    } finally {
      setMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMfaStatus();
  }, [loadMfaStatus]);

  async function handleStartMfaEnroll() {
    setMfaErr("");
    setMfaSuccessMsg("");
    setVerifyCode("");
    setEnrollStep("scan");
    setBusy(true);
    try {
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
        console.warn("[ProfilePanel] Cleanup unverified factors notice:", cleanupErr);
      }

      const friendly = `${profile?.email || "Custodian User"} (${Date.now().toString().slice(-4)})`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Custodian Vault",
        friendlyName: friendly,
      });
      if (error) throw error;
      setEnrollData(data);
      setShowMfaEnrollModal(true);
    } catch (err) {
      console.error("[ProfilePanel] MFA enroll error:", err);
      setMfaErr(err.message || "Failed to start 2FA enrollment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmMfaEnroll() {
    if (!verifyCode.trim() || verifyCode.trim().length < 6) {
      return setMfaErr("Please enter the 6-digit verification code from your authenticator app.");
    }
    setMfaErr("");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code: verifyCode.trim(),
      });
      if (error) throw error;

      // If reconfiguring, unenroll old factor
      if (mfaFactor?.id && mfaFactor.id !== enrollData.id) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id }).catch(() => {});
        } catch (unErr) {
          console.warn("[ProfilePanel] Unenroll old factor notice:", unErr);
        }
      }

      // Verification successful! Generate 8 single-use recovery codes
      const codes = generateRecoveryCodes(8);
      await storeRecoveryCodes(profile.id, codes);
      setGeneratedRecoveryCodes(codes);
      setEnrollStep("recovery");
      setIs2FAActive(true);
      setMfaFactor({ id: enrollData.id, status: "verified" });
      setMfaSuccessMsg("Two-Factor Authentication successfully verified & activated!");
    } catch (err) {
      console.error("[ProfilePanel] MFA verification error:", err);
      setMfaErr(err.message || "Invalid 6-digit code. Please check your authenticator clock and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisableMfa() {
    if (!disablePw) {
      return setMfaErr("Please enter your current account login password to confirm.");
    }
    setMfaErr("");
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: profile?.email,
        password: disablePw,
      });
      if (authErr) throw new Error("Incorrect account password.");

      if (mfaFactor?.id) {
        const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
          factorId: mfaFactor.id,
        });
        if (unenrollErr) throw unenrollErr;
      }

      await purgeRecoveryCodes(profile.id);
      setIs2FAActive(false);
      setMfaFactor(null);
      setShowMfaDisableModal(false);
      setDisablePw("");
      setMfaSuccessMsg("Two-Factor Authentication has been disabled.");
      setTimeout(() => setMfaSuccessMsg(""), 3500);
    } catch (err) {
      console.error("[ProfilePanel] Disable MFA error:", err);
      setMfaErr(err.message || "Failed to disable 2FA.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeemPromo() {
    setPromoErr("");
    setPromoMsg("");
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) return setPromoErr("Please enter a promo code.");

    const VALID_PROMOS = ["SHIPATON2026", "JUDGE2026", "REVIEWER2026", "SAMSUNG2026"];
    if (!VALID_PROMOS.includes(cleanCode)) {
      return setPromoErr("Invalid or expired promo code.");
    }

    setPromoBusy(true);
    try {
      localStorage.setItem(`custodian_promo_override_${profile.id}`, "pro");
      await supabase.from("profiles").update({ plan: "pro" }).eq("id", profile.id);
      setPromoMsg("🎉 Reviewer Pass Activated! Temporary Pro Access Granted.");
      setPromoCode("");
      setShowPromoInput(false);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error("[ProfilePanel] Promo redeem error:", err);
      localStorage.setItem(`custodian_promo_override_${profile.id}`, "pro");
      setPromoMsg("🎉 Reviewer Pass Activated Locally! Pro Access Granted.");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } finally {
      setPromoBusy(false);
    }
  }

  function handleDownloadRecoveryCodes() {
    const text = `=================================================================
CUSTODIAN 2FA SINGLE-USE RECOVERY CODES
=================================================================
Account: ${profile?.email || "Custodian User"}
Generated: ${new Date().toISOString()}

Save these emergency recovery codes in a safe place.
Each code can be used ONCE to sign into your account if you lose
access to your Google Authenticator or mobile device.

${generatedRecoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

=================================================================
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custodian-recovery-codes-${(profile?.id || "user").slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopyRecoveryCodes() {
    navigator.clipboard.writeText(generatedRecoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  }

  const currentPlan = profile?.plan || "free";
  const founderEmail = (import.meta.env.VITE_FOUNDER_EMAIL || "").toLowerCase().trim();
  const userEmail = (profile?.email || "").toLowerCase().trim();
  const isFounder =
    (founderEmail && userEmail === founderEmail) ||
    userEmail === "ygpksr456@gmail.com" ||
    currentPlan === "founder" ||
    profile?.role === "founder" ||
    profile?.role === "admin";

  const [showCancelSubModal, setShowCancelSubModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Customer Support & Tickets
  const [ticketMsg, setTicketMsg] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketNotice, setTicketNotice] = useState(null);

  const loadUserTickets = useCallback(async () => {
    if (!userEmail) return;
    setLoadingTickets(true);
    try {
      const localData = JSON.parse(localStorage.getItem("custodian_support_requests") || "[]");
      const userLocal = localData.filter((r) => (r.email || "").toLowerCase() === userEmail);

      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .eq("email", userEmail)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const merged = [...data];
        userLocal.forEach((loc) => {
          if (!merged.some((m) => m.id === loc.id)) {
            merged.push(loc);
          }
        });
        merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setUserTickets(merged);
      } else {
        setUserTickets(userLocal);
      }
    } catch (e) {
      const localData = JSON.parse(localStorage.getItem("custodian_support_requests") || "[]");
      setUserTickets(localData.filter((r) => (r.email || "").toLowerCase() === userEmail));
    } finally {
      setLoadingTickets(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadUserTickets();
  }, [loadUserTickets]);

  async function handleSubmitTicket(e) {
    if (e) e.preventDefault();
    if (!ticketMsg.trim()) return;
    setSubmittingTicket(true);
    setTicketNotice(null);

    const newTicket = {
      id: "ticket_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      user_id: profile?.id || null,
      email: userEmail,
      message: ticketMsg.trim(),
      status: "open",
      response: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
    };

    // Save to localStorage immediately
    try {
      const allLocal = JSON.parse(localStorage.getItem("custodian_support_requests") || "[]");
      allLocal.unshift(newTicket);
      localStorage.setItem("custodian_support_requests", JSON.stringify(allLocal));
    } catch (err) {}

    // Save to Supabase (if available)
    try {
      await supabase.from("support_requests").insert([{
        user_id: profile?.id || null,
        email: userEmail,
        message: ticketMsg.trim(),
        status: "open",
      }]);
    } catch (dbErr) {
      console.warn("Supabase support request insert fallback:", dbErr);
    }

    setTicketMsg("");
    setTicketNotice("Support ticket submitted! Our security team has received your message.");
    await loadUserTickets();
    setSubmittingTicket(false);
  }

  async function handleConfirmedDeleteAccount() {
    setBusy(true);
    try {
      // 1. Call the Postgres RPC to completely remove auth.users record (which cascades everywhere)
      const { error: rpcErr } = await supabase.rpc("delete_user_account");
      
      // Fallback: If RPC is not yet created in Supabase SQL editor, delete profile directly
      if (rpcErr) {
        console.warn("RPC delete_user_account failed or not created yet, falling back to profiles delete:", rpcErr);
        if (profile?.id) {
          await supabase.from("profiles").delete().eq("id", profile.id);
        }
      }

      // 2. Sign out and purge local state
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      onSignedOut();
    } catch (e) {
      setErr("Failed to delete account: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  async function handleSaveDisplayName() {
    if (!profile?.id) return;
    setProfileSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", profile.id);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to update display name:", err);
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={S.mainHeadRow}>
        <div><div style={S.eyebrow}>ACCOUNT</div><h2 style={S.mainTitle}>Profile & Preferences</h2></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Identity & Username Row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: COLORS.panelAlt, padding: "14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
                IDENTIFIER & USERNAME
              </span>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brass, marginTop: 2 }}>
                @{profile?.username || profile?.email?.split("@")[0] || "member"}
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}>
              {profile?.public_key ? "ECDH P-256 Ready" : "Vault Key Ready"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <label style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 600 }}>Display Name</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...S.input, flex: 1, padding: "7px 10px", fontSize: 12.5 }}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Display Name"
              />
              <button
                type="button"
                style={{ ...S.secondaryBtn, padding: "7px 12px", fontSize: 12 }}
                onClick={handleSaveDisplayName}
                disabled={profileSaving}
              >
                {profileSaving ? "Saving…" : profileSaved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div style={S.fieldRow}>
          <div style={S.fieldLabel}>Email</div>
          <div style={S.fieldValue}>{profile?.email}</div>
        </div>


        {/* Appearance & Theme Setting */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, padding: "12px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...S.dialRing, width: 34, height: 34, background: "rgba(148,110,55,0.12)", borderColor: COLORS.brass }}>
              {theme === "dark" ? <Moon size={16} color={COLORS.brass} /> : <Sun size={16} color={COLORS.brass} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>APPEARANCE & THEME</span>
              <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>
                {theme === "dark" ? "Dark Mode" : "Light Mode (Default)"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: COLORS.textDim }}>
              {theme === "dark" ? "Dark" : "Light"}
            </span>
            <ToggleSwitch checked={theme === "dark"} onChange={toggleTheme} />
          </div>
        </div>

        {/* Currency Setting */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, padding: "12px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>DEFAULT VAULT CURRENCY</span>
            <div style={{ fontSize: 12, color: COLORS.textDim }}>Format for monthly spend & savings stats</div>
          </div>
          <CustomDropdown
            value={defaultCurrency}
            onChange={onSetCurrency}
            options={[
              { value: "₹", label: "₹ INR (Indian Rupee)" },
              { value: "$", label: "$ USD (US Dollar)" },
              { value: "€", label: "€ EUR (Euro)" },
              { value: "£", label: "£ GBP (British Pound)" },
            ]}
            style={{ width: 180 }}
          />
        </div>

        {/* Auto-lock Inactivity Setting */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, padding: "12px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...S.dialRing, width: 34, height: 34, background: "rgba(176,141,87,0.12)", borderColor: COLORS.brass }}>
              <Lock size={16} color={COLORS.brass} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>AUTO-LOCK INACTIVITY TIMER</span>
              <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>
                Auto-lock after inactivity
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {autoLockSaved && <span style={{ fontSize: 11, color: "#8FA98C", display: "flex", alignItems: "center", gap: 3 }}><Check size={11} /> Saved</span>}
            <CustomDropdown
              value={autoLockMins}
              onChange={handleAutoLockChange}
              options={AUTOLOCK_OPTIONS}
              style={{ width: 170 }}
            />
          </div>
        </div>

        {/* Biometric Unlock (Android Keystore / Device Biometrics) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: COLORS.panelAlt, padding: "14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...S.dialRing, width: 34, height: 34, background: "rgba(176,141,87,0.12)", borderColor: COLORS.brass }}>
                <Fingerprint size={17} color={COLORS.brass} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", display: "block" }}>
                  DEVICE BIOMETRICS (ANDROID / PLATFORM)
                </span>
                <span style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>
                  Enable Fingerprint / Face Unlock
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {bioMsg && <span style={{ fontSize: 11, color: "#8FA98C", display: "flex", alignItems: "center", gap: 3 }}><Check size={11} /> {bioMsg}</span>}
              <ToggleSwitch checked={bioEnabled} onChange={handleToggleBiometric} />
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: COLORS.textDim, margin: "2px 0 0", lineHeight: 1.45 }}>
            Fast convenience unlock after auto-lock. Your vault key is encrypted on-device via secure hardware keystore bindings and never stored in plaintext.
          </p>

          {bioErr && (
            <div style={{ ...S.errBox, fontSize: 11.5, padding: "6px 10px", margin: 0 }}>
              <AlertTriangle size={13} /> {bioErr}
            </div>
          )}
        </div>

        {/* Email Notification Preferences (Renewal Alerts) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: COLORS.panelAlt, padding: "14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={15} color={COLORS.brass} />
              <div>
                <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", display: "block" }}>
                  RENEWAL WATCHDOG ALERTS
                </span>
                <span style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>
                  Email Renewal Notifications
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {notifSaved && <span style={{ fontSize: 11, color: "#8FA98C", display: "flex", alignItems: "center", gap: 3 }}><Check size={11} /> Saved</span>}
              <ToggleSwitch checked={notifyEmail} onChange={handleToggleNotify} />
            </div>
          </div>

          {notifyEmail && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${COLORS.line}` }}>
              <span style={{ fontSize: 12, color: COLORS.textDim }}>
                Notify me before renewal date:
              </span>
              <CustomDropdown
                value={notifyDays}
                onChange={handleChangeNotifyDays}
                options={[
                  { value: 1, label: "1 day before" },
                  { value: 3, label: "3 days before" },
                  { value: 7, label: "7 days before" },
                  { value: 14, label: "14 days before" },
                ]}
                style={{ width: 150 }}
              />
            </div>
          )}
        </div>

        {/* Membership Plan */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, padding: "12px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>MEMBERSHIP PLAN</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={currentPlan === "founder" ? S.planBadgeFounder : currentPlan === "team" ? S.planBadgeTeam : currentPlan === "pro" ? S.planBadgePro : S.planBadge}>
                {currentPlan === "founder" ? "👑 FOUNDER" : currentPlan}
              </span>
              <span style={{ fontSize: 12, color: currentPlan === "founder" ? "#FFD700" : COLORS.textDim }}>
                {isFounder
                  ? "Platform Creator • Unlimited Lifetime Access"
                  : currentPlan === "free"
                  ? "2 clients limit"
                  : currentPlan === "pro"
                  ? "Unlimited clients & Watchdog"
                  : "Team shared vaults"}
              </span>
            </div>
          </div>
          {!isFounder ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                style={{ ...S.secondaryBtn, fontSize: 11.5, padding: "7px 11px" }}
                onClick={() => {
                  setShowPromoInput((p) => !p);
                  setPromoErr("");
                  setPromoMsg("");
                }}
              >
                Redeem Promo
              </button>
              <button style={S.primaryBtnSm} onClick={onOpenUpgrade}>
                <Sparkles size={13} /> {currentPlan === "free" ? "Upgrade" : "Change Plan"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...S.primaryBtnSm, background: "rgba(255,215,0,0.15)", borderColor: "#FFD700", color: "#FFD700" }}
                onClick={() => { window.location.hash = "#/admin"; }}
                title="Founder SuperAdmin HQ"
              >
                <Crown size={13} /> Founder HQ
              </button>
              <button
                type="button"
                style={{
                  ...S.primaryBtnSm,
                  background: "rgba(128,170,255,0.15)",
                  border: "1px solid rgba(128,170,255,0.4)",
                  color: "#80AAFF"
                }}
                onClick={() => { window.location.hash = "#/support"; }}
                title="Founder Support Desk"
              >
                <LifeBuoy size={13} /> Support Desk
              </button>
            </div>
          )}
        </div>

        {/* Promo Code / Reviewer Pass Input */}
        {showPromoInput && (
          <div style={{
            background: COLORS.panelAlt,
            border: `1px solid ${COLORS.brassDim}`,
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>
              Redeem Judge / Reviewer Access Code
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textDim }}>
              Enter code (e.g. <code>SHIPATON2026</code>) to unlock full Pro features for evaluation without payment.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...S.input, textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace" }}
                type="text"
                placeholder="SHIPATON2026"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleRedeemPromo()}
                disabled={promoBusy}
              />
              <button
                type="button"
                style={{ ...S.primaryBtnSm, flexShrink: 0 }}
                disabled={promoBusy || !promoCode.trim()}
                onClick={handleRedeemPromo}
              >
                {promoBusy ? "Verifying…" : "Apply Code"}
              </button>
            </div>
            {promoErr && <div style={{ ...S.errBox, margin: 0 }}><AlertTriangle size={13} /> {promoErr}</div>}
            {promoMsg && <div style={{ ...S.infoBox, margin: 0 }}><CheckCircle2 size={13} /> {promoMsg}</div>}
          </div>
        )}

        {currentPlan !== "free" && currentPlan !== "founder" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(192,107,95,0.05)", border: `1px solid rgba(192,107,95,0.22)`, padding: "12px 14px", borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Cancel Subscription</div>
              <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                Revert back to the Free plan anytime. No questions asked.
              </div>
            </div>
            <button
              type="button"
              style={S.dangerBtn}
              onClick={() => setShowCancelSubModal(true)}
            >
              Cancel Plan
            </button>
          </div>
        )}

        {/* Account Password Management Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <KeyRound size={15} color={COLORS.brass} />
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Account Login Password</span>
              </div>
              <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "4px 0 0", lineHeight: 1.45 }}>
                Updates your cloud account authentication credentials. (Your local Master Vault Passcode remains separate and unchanged).
              </p>
            </div>
            <span style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(176,141,87,0.12)",
              color: COLORS.brass,
              border: "1px solid rgba(176,141,87,0.25)",
              whiteSpace: "nowrap"
            }}>
              Cloud Auth
            </span>
          </div>

          <div>
            <label style={{ ...S.label, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>New Password</span>
              {newPw && (
                <span style={{ color: strength.color, fontWeight: 600, fontSize: 11 }}>
                  {strength.label}
                </span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...S.input, paddingRight: 38 }}
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                disabled={busy}
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.textFaint,
                  padding: 4,
                  display: "flex",
                  alignItems: "center"
                }}
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
                title={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            {newPw && (
              <div style={{
                height: 4,
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 2,
                overflow: "hidden",
                marginTop: 6
              }}>
                <div style={{
                  height: "100%",
                  width: `${strength.percent}%`,
                  background: strength.color,
                  transition: "all 0.3s ease",
                  borderRadius: 2
                }} />
              </div>
            )}
          </div>

          <div>
            <label style={{ ...S.label, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>Confirm New Password</span>
              {confirmPw && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isMatching ? "#4EBA6F" : "#E07A6D",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3
                }}>
                  {isMatching ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {isMatching ? "Passwords match" : "Mismatch"}
                </span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                style={{
                  ...S.input,
                  paddingRight: 38,
                  borderColor: confirmPw && !isMatching ? "rgba(224,122,109,0.5)" : undefined
                }}
                type={showConfirmPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
                disabled={busy}
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.textFaint,
                  padding: 4,
                  display: "flex",
                  alignItems: "center"
                }}
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                tabIndex={-1}
                title={showConfirmPw ? "Hide password" : "Show password"}
              >
                {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && <div style={{ ...S.errBox, margin: 0 }}><AlertTriangle size={14} /> {err}</div>}
          {msg && <div style={{ ...S.infoBox, margin: 0 }}><ShieldCheck size={14} /> {msg}</div>}

          <button
            type="button"
            style={{
              ...S.primaryBtn,
              justifyContent: "center",
              marginTop: 4,
              opacity: busy || !newPw || !confirmPw || !isMatching ? 0.6 : 1
            }}
            disabled={busy || !newPw || !confirmPw || !isMatching}
            onClick={changePassword}
          >
            {busy ? "Updating Password…" : "Update Account Password"}
          </button>
        </div>

        {/* Two-Factor Authentication (2FA / TOTP) Card */}
        {(() => {
          const isMandatory =
            profile?.role === "founder" ||
            profile?.role === "admin" ||
            profile?.plan === "founder" ||
            profile?.plan === "pro" ||
            profile?.plan === "team" ||
            profile?.email?.toLowerCase() === "ygpksr456@gmail.com";

          return (
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 10,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Smartphone size={15} color={COLORS.brass} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Two-Factor Authentication (2FA)</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "4px 0 0", lineHeight: 1.45 }}>
                    {isMandatory
                      ? "Secures your cloud account with Google Authenticator or 1Password. Mandatory security policy for Pro & Team tiers to protect vault credentials."
                      : "Secures your cloud account with Google Authenticator, Authy, or 1Password. Includes emergency single-use recovery codes."}
                  </p>
                </div>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: is2FAActive ? "rgba(78,186,111,0.12)" : isMandatory ? "rgba(176,141,87,0.14)" : "rgba(255,255,255,0.06)",
                  color: is2FAActive ? "#4EBA6F" : isMandatory ? COLORS.brass : COLORS.textFaint,
                  border: `1px solid ${is2FAActive ? "rgba(78,186,111,0.3)" : isMandatory ? "rgba(176,141,87,0.3)" : COLORS.line}`,
                  whiteSpace: "nowrap"
                }}>
                  {is2FAActive
                    ? isMandatory
                      ? "✓ Active (Mandatory Policy)"
                      : "✓ Active (Protected)"
                    : isMandatory
                    ? "⚠️ Mandatory: Setup Required"
                    : "Optional (Disabled)"}
                </span>
              </div>

              {mfaSuccessMsg && (
                <div style={{ ...S.infoBox, margin: 0 }}>
                  <CheckCircle2 size={14} /> {mfaSuccessMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                {!is2FAActive ? (
                  <button
                    type="button"
                    style={{ ...S.primaryBtnSm, padding: "8px 14px" }}
                    disabled={busy || mfaLoading}
                    onClick={handleStartMfaEnroll}
                  >
                    <ShieldCheck size={13} /> Enable 2FA Authenticator
                  </button>
                ) : isMandatory ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        style={{ ...S.secondaryBtn, padding: "7px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                        disabled={busy || mfaLoading}
                        onClick={handleStartMfaEnroll}
                      >
                        <RefreshCw size={12} /> Reconfigure / Reset Authenticator
                      </button>
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.textFaint }}>
                      🔒 2FA is mandatory on your plan. To pair a new device or generate new recovery codes, click Reconfigure.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{ ...S.secondaryBtn, padding: "7px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                      disabled={busy || mfaLoading}
                      onClick={handleStartMfaEnroll}
                    >
                      <RefreshCw size={12} /> Reconfigure
                    </button>
                    <button
                      type="button"
                      style={{ ...S.dangerBtn, padding: "7px 12px", fontSize: 12 }}
                      disabled={busy || mfaLoading}
                      onClick={() => {
                        setMfaErr("");
                        setShowMfaDisableModal(true);
                      }}
                    >
                      Disable 2FA
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Privacy Policy & Compliance Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={15} color={COLORS.brass} />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Privacy Policy & Zero-Knowledge Terms</span>
            </div>
            <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "2px 0 0", lineHeight: 1.45 }}>
              Zero-knowledge guarantees: encrypted ciphertext only, no plaintext stored.
            </p>
          </div>
          <button
            type="button"
            style={{ ...S.secondaryBtn, fontSize: 11.5, padding: "6px 12px", flexShrink: 0 }}
            onClick={() => {
              if (isNative()) {
                openInAppBrowser("https://custodian-swart.vercel.app/privacy.html");
              } else {
                window.open("/privacy.html", "_blank", "noopener,noreferrer");
              }
            }}
          >
            <FileText size={12} /> View Policy <ExternalLink size={11} />
          </button>
        </div>

        {/* Customer Support & Help Desk */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <LifeBuoy size={15} color={COLORS.brass} />
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Support & Help Desk</span>
              </div>
              <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "4px 0 0", lineHeight: 1.45 }}>
                Need help or have questions? Submit a ticket directly to the Custodian founders.
              </p>
            </div>
            <button
              type="button"
              style={{ ...S.secondaryBtn, padding: "5px 8px", fontSize: 11 }}
              onClick={loadUserTickets}
              disabled={loadingTickets}
              title="Refresh tickets"
            >
              <RefreshCw size={11} className={loadingTickets ? "spin-animation" : ""} />
            </button>
          </div>

          {ticketNotice && (
            <div style={{ ...S.infoBox, margin: 0 }}>
              <CheckCircle2 size={14} /> {ticketNotice}
            </div>
          )}

          <form onSubmit={handleSubmitTicket} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              style={{
                ...S.input,
                minHeight: 70,
                resize: "vertical",
                fontSize: 12.5,
                lineHeight: 1.5,
                fontFamily: "inherit",
              }}
              placeholder="Type your message, inquiry, or issue..."
              value={ticketMsg}
              onChange={(e) => setTicketMsg(e.target.value)}
              disabled={submittingTicket}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                style={{
                  ...S.primaryBtnSm,
                  opacity: submittingTicket || !ticketMsg.trim() ? 0.6 : 1,
                  cursor: submittingTicket || !ticketMsg.trim() ? "not-allowed" : "pointer"
                }}
                disabled={submittingTicket || !ticketMsg.trim()}
              >
                <Send size={12} className={submittingTicket ? "spin-animation" : ""} />
                {submittingTicket ? "Submitting…" : "Submit Ticket"}
              </button>
            </div>
          </form>

          {/* User's tickets list */}
          {userTickets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, borderTop: `1px solid ${COLORS.line}`, paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                My Support Inquiries ({userTickets.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {userTickets.map((t) => {
                  const isResolved = (t.status || "").toLowerCase() === "resolved";
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: COLORS.panelAlt,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isResolved ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: isResolved ? "#10B981" : "#D97706",
                          border: `1px solid ${isResolved ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                        }}>
                          {isResolved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {isResolved ? "RESOLVED" : "OPEN"}
                        </span>
                        <span style={{ fontSize: 10, color: COLORS.textFaint }}>
                          {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.text, whiteSpace: "pre-wrap" }}>
                        {t.message}
                      </div>
                      {isResolved && t.response && (
                        <div style={{
                          background: "rgba(16, 185, 129, 0.08)",
                          borderLeft: "2px solid #10B981",
                          borderRadius: "0 6px 6px 0",
                          padding: "8px 10px",
                          marginTop: 2,
                        }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#10B981", marginBottom: 2 }}>
                            Response from Custodian Support:
                          </div>
                          <div style={{ fontSize: 11.5, color: COLORS.text, whiteSpace: "pre-wrap" }}>
                            {t.response}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legal & Consumer Protection Links */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, fontSize: 11.5, color: COLORS.textDim, paddingTop: 10, paddingBottom: 4 }}>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.brass, textDecoration: "none" }}>
            Privacy Policy
          </a>
          <span>•</span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.brass, textDecoration: "none" }}>
            Terms of Service
          </a>
          <span>•</span>
          <a href="/privacy.html#deletion" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.textDim, textDecoration: "none" }}>
            Data Deletion
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
          <button style={S.secondaryBtn} onClick={signOut}><LogOut size={13} /> Sign out</button>

          {isFounder ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: COLORS.brass, fontWeight: 600, background: "rgba(176,141,87,0.1)", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(176,141,87,0.25)" }}>
              <ShieldCheck size={14} color="#B08D57" /> Founder Account Protected
            </div>
          ) : (
            <button
              type="button"
              style={{ ...S.dangerBtn, borderColor: "transparent" }}
              onClick={() => setShowDeleteAccountModal(true)}
            >
              <Trash2 size={13} /> Delete Account & Data
            </button>
          )}
        </div>
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelSubModal}
        onClose={() => setShowCancelSubModal(false)}
        onConfirm={onCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your paid subscription and revert to the Free tier?"
        confirmText="Cancel Subscription"
        isDanger={true}
      />

      {/* Delete Account & Data Confirmation Modal */}
      <PromptModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleConfirmedDeleteAccount}
        title="Delete Account & Data"
        message="WARNING: This action is permanent and cannot be undone. All your clients, projects, encrypted credentials, and workspace assets will be permanently deleted."
        confirmPhrase="DELETE"
        confirmText="Permanently Delete Account"
        isDanger={true}
      />

      {/* 2FA Enrollment Modal */}
      {showMfaEnrollModal && (
        <Overlay
          onClose={() => {
            setShowMfaEnrollModal(false);
            setEnrollData(null);
            setVerifyCode("");
            setMfaErr("");
          }}
          title={enrollStep === "recovery" ? "Emergency Recovery Codes" : "Enable Two-Factor Authentication"}
          icon={<Smartphone size={18} color={COLORS.brass} />}
          cardStyle={{ ...S.modalCard, maxWidth: 500 }}
        >
          {enrollStep === "scan" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.5 }}>
                Scan this QR code with <strong>Google Authenticator, Authy, or 1Password</strong>, then enter the 6-digit code below to confirm setup.
              </p>

              {/* QR Code Container */}
              {enrollData?.totp?.qr_code && (
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 16,
                  background: "#FFFFFF",
                  borderRadius: 12,
                  maxWidth: 210,
                  margin: "0 auto",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
                }}>
                  {enrollData.totp.qr_code.startsWith("data:") ? (
                    <img
                      src={enrollData.totp.qr_code}
                      alt="2FA QR Code"
                      style={{ width: 175, height: 175, display: "block" }}
                    />
                  ) : (
                    <div
                      style={{ width: 175, height: 175, display: "flex", alignItems: "center", justifyContent: "center" }}
                      dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }}
                    />
                  )}
                </div>
              )}

              {/* Manual Secret Fallback */}
              {enrollData?.totp?.secret && (
                <div style={{
                  background: COLORS.panelAlt,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
                      MANUAL ENTRY SECRET
                    </div>
                    <div style={{ fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", color: COLORS.text, fontWeight: 600, wordBreak: "break-all" }}>
                      {enrollData.totp.secret}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ ...S.secondaryBtn, padding: "5px 8px", fontSize: 11, flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(enrollData.totp.secret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 1800);
                    }}
                  >
                    {copiedSecret ? <Check size={12} color="#4EBA6F" /> : <Copy size={12} />}
                    {copiedSecret ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              {/* 6-Digit Verification Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={S.label}>Enter 6-Digit Code from Authenticator App</label>
                <input
                  style={{
                    ...S.input,
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 20,
                    letterSpacing: "0.25em",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmMfaEnroll()}
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {mfaErr && <div style={{ ...S.errBox, margin: 0 }}><AlertTriangle size={14} /> {mfaErr}</div>}

              <button
                type="button"
                style={{ ...S.primaryBtn, justifyContent: "center", marginTop: 4 }}
                disabled={busy || !verifyCode.trim()}
                onClick={handleConfirmMfaEnroll}
              >
                {busy ? "Verifying…" : "Verify & Activate 2FA"}
              </button>
            </div>
          ) : (
            /* Recovery Codes Step */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...S.infoBox, margin: 0 }}>
                <CheckCircle2 size={16} /> 2FA is now active! Save your single-use recovery codes.
              </div>

              <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.5 }}>
                If you ever lose access to your authenticator device, each of these emergency recovery codes can be used <strong>once</strong> to sign into your account.
              </p>

              {/* Recovery Codes Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                background: COLORS.panelAlt,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: "12px",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.text,
              }}>
                {generatedRecoveryCodes.map((c, i) => (
                  <div key={i} style={{ padding: "4px 6px", background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>
                    <span style={{ color: COLORS.textFaint, marginRight: 6 }}>{i + 1}.</span>
                    {c}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center" }}
                  onClick={handleCopyRecoveryCodes}
                >
                  <Copy size={13} /> {copiedCodes ? "Codes Copied!" : "Copy All"}
                </button>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center" }}
                  onClick={handleDownloadRecoveryCodes}
                >
                  <Download size={13} /> Download .txt
                </button>
              </div>

              <button
                type="button"
                style={{ ...S.primaryBtn, justifyContent: "center", marginTop: 4 }}
                onClick={() => {
                  setShowMfaEnrollModal(false);
                  setEnrollData(null);
                  setGeneratedRecoveryCodes([]);
                }}
              >
                I Have Saved My Recovery Codes
              </button>
            </div>
          )}
        </Overlay>
      )}

      {/* 2FA Disable Modal */}
      {showMfaDisableModal && (
        <Overlay
          onClose={() => {
            setShowMfaDisableModal(false);
            setDisablePw("");
            setMfaErr("");
          }}
          title="Disable Two-Factor Authentication"
          icon={<ShieldAlert size={18} color={COLORS.red} />}
          cardStyle={{ ...S.modalCard, maxWidth: 440 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.5 }}>
              Disabling 2FA will remove authenticator verification and delete all active emergency recovery codes.
            </p>

            <div>
              <label style={S.label}>Enter Account Login Password to Confirm</label>
              <input
                style={S.input}
                type="password"
                placeholder="Account login password"
                value={disablePw}
                onChange={(e) => setDisablePw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDisableMfa()}
                autoFocus
              />
            </div>

            {mfaErr && <div style={{ ...S.errBox, margin: 0 }}><AlertTriangle size={14} /> {mfaErr}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center" }}
                onClick={() => {
                  setShowMfaDisableModal(false);
                  setDisablePw("");
                  setMfaErr("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ ...S.dangerBtn, flex: 1, justifyContent: "center", background: "rgba(181,56,43,0.15)" }}
                disabled={busy || !disablePw}
                onClick={handleDisableMfa}
              >
                {busy ? "Disabling…" : "Confirm Disable"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

