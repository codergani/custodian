import React, { useState, useEffect } from "react";
import {
  Sparkles, AlertTriangle, ShieldCheck, LogOut, Bell, Check, Sun, Moon, Trash2, Clock, Lock, Crown, Zap, ShieldAlert
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { S, COLORS } from "../styles";
import { CustomDropdown, ToggleSwitch, ConfirmModal, PromptModal } from "./shared";
import { getAutoLockMinutes, setAutoLockMinutes, AUTOLOCK_OPTIONS } from "../security";

export default function ProfilePanel({
  profile,
  defaultCurrency,
  onSetCurrency,
  onSignedOut,
  onOpenUpgrade,
  onCancelSubscription,
  theme = "light",
  toggleTheme,
  onSetAutoLock,
}) {
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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

  async function changePassword() {
    setErr(""); setMsg("");
    if (newPw.length < 8) return setErr("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) setErr(error.message); else { setMsg("Password updated."); setNewPw(""); }
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  const currentPlan = profile?.plan || "free";
  const founderEmail = (import.meta.env.VITE_FOUNDER_EMAIL || "").toLowerCase().trim();
  const userEmail = (profile?.email || "").toLowerCase().trim();
  const isFounder = (founderEmail && userEmail === founderEmail) || currentPlan === "founder" || profile?.role === "founder";

  const [showCancelSubModal, setShowCancelSubModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

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

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={S.mainHeadRow}>
        <div><div style={S.eyebrow}>ACCOUNT</div><h2 style={S.mainTitle}>Profile & Preferences</h2></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                {currentPlan === "founder"
                  ? "Platform Creator • Unlimited Lifetime Access"
                  : currentPlan === "free"
                  ? "2 clients limit"
                  : currentPlan === "pro"
                  ? "Unlimited clients & Watchdog"
                  : "Team shared vaults"}
              </span>
            </div>
          </div>
          {currentPlan !== "founder" ? (
            <button style={S.primaryBtnSm} onClick={onOpenUpgrade}>
              <Sparkles size={13} /> {currentPlan === "free" ? "Upgrade" : "Change Plan"}
            </button>
          ) : (
            <button
              type="button"
              style={{ ...S.primaryBtnSm, background: "rgba(255,215,0,0.15)", borderColor: "#FFD700", color: "#FFD700" }}
              onClick={() => { window.location.hash = "#/admin"; }}
            >
              <Crown size={13} /> Founder HQ
            </button>
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

        <div>
          <label style={S.label}>Change account password</label>
          <input style={S.input} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" />
          {err && <div style={{ ...S.errBox, marginTop: 8 }}><AlertTriangle size={14} /> {err}</div>}
          {msg && <div style={{ ...S.infoBox, marginTop: 8 }}><ShieldCheck size={14} /> {msg}</div>}
          <button style={S.primaryBtn} disabled={busy} onClick={changePassword}>Update password</button>
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

