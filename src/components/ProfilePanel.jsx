import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles, AlertTriangle, ShieldCheck, LogOut, Bell, Check, Sun, Moon, Trash2, Clock, Lock, Crown, Zap, ShieldAlert, Fingerprint,
  Eye, EyeOff, KeyRound, CheckCircle2, LifeBuoy, MessageSquare, Send, RefreshCw, Mail
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { S, COLORS } from "../styles";
import { CustomDropdown, ToggleSwitch, ConfirmModal, PromptModal } from "./shared";
import { getAutoLockMinutes, setAutoLockMinutes, AUTOLOCK_OPTIONS } from "../security";
import { isBiometricsAvailable, isBiometricEnabled, enableBiometricUnlock, disableBiometricUnlock } from "../native/nativeBridge";
import { exportKeyRaw } from "../crypto";
import { checkPasswordStrength } from "../utils/passwordGenerator";

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
            <button style={S.primaryBtnSm} onClick={onOpenUpgrade}>
              <Sparkles size={13} /> {currentPlan === "free" ? "Upgrade" : "Change Plan"}
            </button>
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
    </div>
  );
}

