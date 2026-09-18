import React, { useState, useEffect } from "react";
import { Lock, AlertTriangle, Eye, EyeOff, LogOut, ShieldCheck, Download, KeyRound, AlertOctagon, CheckSquare, Square, Fingerprint, HelpCircle, Info, X } from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  deriveKey,
  encryptJSON,
  decryptJSON,
  newSalt,
  withTimeout,
  generateECDHKeyPair,
  exportPublicKeyJWK,
  exportEncryptedPrivateKey,
  importDecryptedPrivateKey,
  importKeyRaw,
} from "./crypto";
import { getLockoutState, recordFailedAttempt, clearFailedAttempts } from "./security";
import { isBiometricsAvailable, isBiometricEnabled, unlockWithBiometrics } from "./native/nativeBridge";
import { S, COLORS } from "./styles";
import { Overlay } from "./components/shared";

// profile: the current user's row from `profiles` (has vault_salt / vault_check, may be null on first run)
export default function VaultUnlock({ userId, profile, onUnlocked }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [ackLoss, setAckLoss] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [savedKit, setSavedKit] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(() => getLockoutState(userId).remainingSeconds);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const isBioEnrolled = isBiometricEnabled(userId);

  useEffect(() => {
    isBiometricsAvailable().then((avail) => {
      setBioAvailable(avail && isBioEnrolled);
    });
  }, [userId, isBioEnrolled]);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      const state = getLockoutState(userId);
      setLockoutRemaining(state.remainingSeconds);
      if (state.remainingSeconds <= 0) {
        setErr("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining, userId]);

  const localSalt = localStorage.getItem(`demo_vault_salt_${userId}`);
  const isFirstTime = !profile?.vault_salt && !localSalt;

  function handleDownloadRecoveryKit() {
    const salt = profile?.vault_salt || localSalt || newSalt();
    const kitText = `=================================================================
CUSTODIAN ZERO-KNOWLEDGE EMERGENCY VAULT RECOVERY KIT
=================================================================
Account ID: ${userId}
Account Email: ${profile?.email || "N/A"}
Vault Creation Date: ${new Date().toISOString()}
Cryptographic Salt: ${salt}

-----------------------------------------------------------------
CRITICAL ZERO-KNOWLEDGE RECOVERY INSTRUCTIONS:
-----------------------------------------------------------------
1. Custodian uses true zero-knowledge client-side encryption (AES-256-GCM).
2. Your Master Vault Password NEVER leaves your browser/device.
3. Custodian servers store ONLY scrambled ciphertext and CANNOT reset
   your password or decrypt your data if you lose it.
4. Keep your Master Vault Password written in a secure physical location
   or in a dedicated master password manager.

=================================================================
`;
    const blob = new Blob([kitText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custodian-recovery-kit-${userId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedKit(true);
  }

  async function handleFirstTimeSetup() {
    setErr("");
    if (pw.length < 8) return setErr("Use at least 8 characters for your vault password.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    if (!ackLoss) return setErr("Please confirm that you understand your password cannot be reset if lost.");
    setBusy(true);
    try {
      const salt = newSalt();
      const key = await withTimeout(deriveKey(pw, salt), 8000, "Key generation");
      const check = await withTimeout(encryptJSON(key, { marker: "ok" }), 8000, "Encryption");

      // Generate ECDH P-256 keypair for zero-knowledge asymmetric sharing
      const ecdhPair = await withTimeout(generateECDHKeyPair(), 8000, "Asymmetric key generation");
      const pubKeyJWK = await exportPublicKeyJWK(ecdhPair.publicKey);
      const encryptedPrivKey = await exportEncryptedPrivateKey(ecdhPair.privateKey, key);

      localStorage.setItem(`demo_vault_salt_${userId}`, salt);
      localStorage.setItem(`demo_vault_check_${userId}`, JSON.stringify(check));
      localStorage.setItem(`demo_vault_ecdh_pub_${userId}`, pubKeyJWK);
      localStorage.setItem(`demo_vault_ecdh_priv_${userId}`, encryptedPrivKey);

      try {
        await supabase
          .from("profiles")
          .update({
            vault_salt: salt,
            vault_check: check,
            public_key: pubKeyJWK,
            encrypted_private_key: encryptedPrivKey,
          })
          .eq("id", userId);
      } catch (dbErr) {
        console.warn("Could not save salt/asymmetric keys to DB, using local storage:", dbErr);
      }
      clearFailedAttempts(userId);
      onUnlocked(key, ecdhPair.privateKey, pubKeyJWK);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function handleUnlock() {
    if (lockoutRemaining > 0) {
      return setErr(`Too many attempts, try again in ${lockoutRemaining}s`);
    }
    if (!pw) return setErr("Please enter your vault password.");
    setErr("");
    setBusy(true);
    try {
      const salt = profile?.vault_salt || localStorage.getItem(`demo_vault_salt_${userId}`);
      const check = profile?.vault_check || JSON.parse(localStorage.getItem(`demo_vault_check_${userId}`) || "null");
      const key = await withTimeout(deriveKey(pw, salt), 8000, "Key generation");
      if (check) {
        const result = await withTimeout(decryptJSON(key, check), 8000, "Verifying");
        if (result?.marker !== "ok") throw new Error("Wrong vault password.");
      }

      // Provision or decrypt ECDH asymmetric private key
      let ecdhPrivKey = null;
      let pubKeyJWK = profile?.public_key || localStorage.getItem(`demo_vault_ecdh_pub_${userId}`);
      const encryptedPrivKey = profile?.encrypted_private_key || localStorage.getItem(`demo_vault_ecdh_priv_${userId}`);

      if (encryptedPrivKey) {
        try {
          ecdhPrivKey = await importDecryptedPrivateKey(encryptedPrivKey, key);
        } catch (privErr) {
          console.warn("[VaultUnlock] Private key import error, regenerating:", privErr);
        }
      }

      // Auto-migrate legacy vaults that don't have ECDH keys yet
      if (!ecdhPrivKey) {
        const ecdhPair = await generateECDHKeyPair();
        ecdhPrivKey = ecdhPair.privateKey;
        pubKeyJWK = await exportPublicKeyJWK(ecdhPair.publicKey);
        const newEncPrivKey = await exportEncryptedPrivateKey(ecdhPair.privateKey, key);

        localStorage.setItem(`demo_vault_ecdh_pub_${userId}`, pubKeyJWK);
        localStorage.setItem(`demo_vault_ecdh_priv_${userId}`, newEncPrivKey);

        try {
          await supabase
            .from("profiles")
            .update({ public_key: pubKeyJWK, encrypted_private_key: newEncPrivKey })
            .eq("id", userId);
        } catch (dbErr) {
          console.warn("[VaultUnlock] Asymmetric key migration notice:", dbErr);
        }
      }

      clearFailedAttempts(userId);
      onUnlocked(key, ecdhPrivKey, pubKeyJWK);
    } catch (e) {
      const failState = recordFailedAttempt(userId);
      if (failState.remainingSeconds > 0) {
        setLockoutRemaining(failState.remainingSeconds);
        setErr(`Too many attempts, try again in ${failState.remainingSeconds}s`);
      } else {
        setErr("Wrong vault password. Please check your spelling and try again.");
      }
    }
    setBusy(false);
  }

  async function handleBiometricUnlock() {
    if (lockoutRemaining > 0) {
      return setErr(`Too many attempts, try again in ${lockoutRemaining}s`);
    }
    setErr("");
    setBusy(true);
    try {
      const rawVaultKeyB64 = await unlockWithBiometrics(userId);
      if (!rawVaultKeyB64) {
        setErr("Biometric authentication canceled or failed. Please enter your passcode.");
        setBusy(false);
        return;
      }

      const key = await importKeyRaw(rawVaultKeyB64);

      // Verify check if available
      const check = profile?.vault_check || JSON.parse(localStorage.getItem(`demo_vault_check_${userId}`) || "null");
      if (check) {
        try {
          const result = await decryptJSON(key, check);
          if (result?.marker !== "ok") throw new Error("Vault check failed.");
        } catch {
          throw new Error("Biometric key mismatch. Please enter your master passcode.");
        }
      }

      // Provision or decrypt ECDH asymmetric private key
      let ecdhPrivKey = null;
      let pubKeyJWK = profile?.public_key || localStorage.getItem(`demo_vault_ecdh_pub_${userId}`);
      const encryptedPrivKey = profile?.encrypted_private_key || localStorage.getItem(`demo_vault_ecdh_priv_${userId}`);

      if (encryptedPrivKey) {
        try {
          ecdhPrivKey = await importDecryptedPrivateKey(encryptedPrivKey, key);
        } catch (privErr) {
          console.warn("[VaultUnlock] Private key import error with biometric key:", privErr);
        }
      }

      if (!ecdhPrivKey) {
        const ecdhPair = await generateECDHKeyPair();
        ecdhPrivKey = ecdhPair.privateKey;
        pubKeyJWK = await exportPublicKeyJWK(ecdhPair.publicKey);
        const newEncPrivKey = await exportEncryptedPrivateKey(ecdhPair.privateKey, key);

        localStorage.setItem(`demo_vault_ecdh_pub_${userId}`, pubKeyJWK);
        localStorage.setItem(`demo_vault_ecdh_priv_${userId}`, newEncPrivKey);
      }

      clearFailedAttempts(userId);
      onUnlocked(key, ecdhPrivKey, pubKeyJWK);
    } catch (e) {
      setErr(e.message || "Biometric unlock failed. Please use your master passcode.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    sessionStorage.removeItem("custodian_session_vault_key");
    await supabase.auth.signOut();
  }

  return (
    <div style={S.centerScreen}>
      <div style={{ ...S.authCard, maxWidth: isFirstTime ? 480 : 420 }}>
        <div style={S.authHeader}>
          <div style={S.dialRing}><Lock size={22} color={COLORS.brass} /></div>
          <div>
            <div style={S.eyebrow}>{isFirstTime ? "MASTER ENCRYPTION PASSCODE" : "UNLOCK SECURE VAULT"}</div>
            <h1 style={S.authTitle}>{isFirstTime ? "Create Master Passcode" : "Enter Vault Passcode"}</h1>
          </div>
        </div>

        {isFirstTime ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "8px 0 14px" }}>
            <p style={{ ...S.authSub, fontSize: 12.5, lineHeight: 1.55, color: COLORS.textDim, margin: 0 }}>
              Your Master Passcode derives a 256-bit AES-GCM encryption key directly inside your device's browser memory. 
              <strong> Custodian NEVER sends or stores this password.</strong>
            </p>

            {/* Critical Zero-Knowledge Loss Warning Callout */}
            <div style={{
              background: "rgba(224, 122, 109, 0.08)",
              border: "1px solid rgba(224, 122, 109, 0.35)",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}>
              <AlertOctagon size={18} color="#E07A6D" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: COLORS.text }}>
                <strong style={{ color: "#E07A6D", display: "block", marginBottom: 2 }}>
                  ⚠️ Unrecoverable Zero-Knowledge Notice
                </strong>
                Because your data is encrypted client-side, <strong>if you forget this passcode, your credentials cannot be recovered or reset by anyone</strong> (not even Custodian administrators).
              </div>
            </div>

            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                padding: "6px 10px",
                fontSize: 11.5,
                justifyContent: "center",
                background: "rgba(176,141,87,0.06)",
                borderColor: COLORS.brassDim,
                color: COLORS.brass,
              }}
              onClick={handleDownloadRecoveryKit}
            >
              <Download size={13} />
              <span>{savedKit ? "✓ Emergency Recovery Kit Saved" : "Download Emergency Recovery Kit (.txt)"}</span>
            </button>
          </div>
        ) : (
          <p style={{ ...S.authSub, fontSize: 12.5, lineHeight: 1.55, color: COLORS.textDim }}>
            Enter your master passcode to decrypt your client credentials and workspace keys locally on this device.
          </p>
        )}

        <label style={S.label}>Master vault passcode</label>
        <div style={{ position: "relative", width: "100%" }}>
          <input
            style={{ ...S.input, paddingRight: 38, opacity: lockoutRemaining > 0 ? 0.6 : 1 }}
            type={showPw ? "text" : "password"}
            value={pw}
            disabled={busy || lockoutRemaining > 0}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (isFirstTime ? handleFirstTimeSetup() : handleUnlock())}
            autoFocus
            placeholder={isFirstTime ? "At least 8 characters" : lockoutRemaining > 0 ? `Locked (${lockoutRemaining}s remaining)` : "Your master passcode"}
          />
          <button
            type="button"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: lockoutRemaining > 0 ? "not-allowed" : "pointer", color: COLORS.textFaint, padding: 4, display: "flex", alignItems: "center" }}
            onClick={() => setShowPw((prev) => !prev)}
            disabled={lockoutRemaining > 0}
            tabIndex={-1}
            title={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {isFirstTime && (
          <>
            <label style={S.label}>Confirm master passcode</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                style={{ ...S.input, paddingRight: 38 }}
                type={showPw2 ? "text" : "password"}
                value={pw2}
                disabled={busy}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFirstTimeSetup()}
                placeholder="Re-enter master passcode"
              />
              <button
                type="button"
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint, padding: 4, display: "flex", alignItems: "center" }}
                onClick={() => setShowPw2((prev) => !prev)}
                tabIndex={-1}
                title={showPw2 ? "Hide password" : "Show password"}
              >
                {showPw2 ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Acknowledgment Checkbox */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 8,
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setAckLoss(!ackLoss)}
            >
              <div style={{ marginTop: 1, color: ackLoss ? COLORS.brass : COLORS.textFaint }}>
                {ackLoss ? <CheckSquare size={16} color={COLORS.brass} /> : <Square size={16} />}
              </div>
              <span style={{ fontSize: 11.5, color: ackLoss ? COLORS.text : COLORS.textDim, lineHeight: 1.4 }}>
                I understand that Custodian is zero-knowledge and <strong>cannot reset my password</strong> if I lose it.
              </span>
            </div>
          </>
        )}

        {err && <div style={S.errBox}><AlertTriangle size={14} /> {err}</div>}
        {lockoutRemaining > 0 && !err && (
          <div style={S.errBox}><AlertTriangle size={14} /> Too many attempts, try again in {lockoutRemaining}s</div>
        )}
        {import.meta.env.DEV && lockoutRemaining > 0 && (
          <button
            type="button"
            style={{ ...S.iconBtnGhost, fontSize: 11, color: COLORS.brass, marginTop: 4, alignSelf: "center" }}
            onClick={() => {
              clearFailedAttempts(userId);
              setLockoutRemaining(0);
              setErr("");
            }}
          >
            Reset Lockout (Dev)
          </button>
        )}

        {!isFirstTime && isBioEnrolled && (
          <button
            type="button"
            style={{
              ...S.secondaryBtn,
              marginTop: 14,
              padding: "11px 16px",
              fontSize: 13,
              fontWeight: 600,
              justifyContent: "center",
              background: "rgba(176,141,87,0.12)",
              borderColor: COLORS.brass,
              color: COLORS.brass,
              width: "100%",
            }}
            disabled={busy || lockoutRemaining > 0}
            onClick={handleBiometricUnlock}
          >
            <Fingerprint size={17} />
            <span>{busy ? "Authenticating…" : "Unlock with Fingerprint / Face ID"}</span>
          </button>
        )}

        <button
          type="button"
          style={{ ...S.primaryBtn, marginTop: (!isFirstTime && isBioEnrolled) ? 8 : 14 }}
          disabled={busy || lockoutRemaining > 0 || (isFirstTime && !ackLoss)}
          onClick={isFirstTime ? handleFirstTimeSetup : handleUnlock}
        >
          {busy
            ? (isFirstTime ? "Deriving AES Key…" : "Decrypting Vault…")
            : lockoutRemaining > 0
            ? `Temporarily Locked (${lockoutRemaining}s)`
            : (isFirstTime ? "Initialize Secure Vault" : (!isFirstTime && isBioEnrolled ? "Unlock with Master Passcode" : "Unlock Vault"))}
        </button>

        {!isFirstTime && (
          <div style={{ marginTop: 8, textAlign: "center" }}>
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
                gap: 5,
                padding: "4px 8px",
                textDecoration: "underline",
                textUnderlineOffset: 3
              }}
              onClick={() => setShowForgotHelp(true)}
            >
              <HelpCircle size={13} /> Forgot Master Passcode?
            </button>
          </div>
        )}

        <div style={S.securityGuaranteeBadge}>
          <ShieldCheck size={16} color={COLORS.brass} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ color: COLORS.text, fontWeight: 600, display: "block", marginBottom: 1 }}>
              Client-Side Cryptography (AES-256-GCM)
            </span>
            <span>
              Key derivation (PBKDF2/SHA-256) happens locally in browser memory. Your plain passcode and secret keys are never transmitted over the internet.
            </span>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <button
            type="button"
            style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px" }}
            onClick={handleSignOut}
          >
            <LogOut size={12} /> Sign out & switch account
          </button>
        </div>
      </div>

      {/* Zero-Knowledge Master Passcode Assistance Modal */}
      {showForgotHelp && (
        <Overlay
          onClose={() => setShowForgotHelp(false)}
          title="Master Passcode Recovery"
          icon={<KeyRound size={18} color={COLORS.brass} />}
          cardStyle={{ ...S.modalCard, maxWidth: 480 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 12.5, lineHeight: 1.5, color: COLORS.textDim }}>
            <div style={{
              background: "rgba(176, 141, 87, 0.08)",
              border: `1px solid ${COLORS.brassDim}`,
              borderRadius: 8,
              padding: "12px 14px",
              color: COLORS.text,
              display: "flex",
              gap: 10
            }}>
              <Info size={18} color={COLORS.brass} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: COLORS.brass, display: "block", marginBottom: 3 }}>
                  Cloud Account Password vs. Master Vault Passcode
                </strong>
                Your <strong>Account Password</strong> signs you into the cloud. Your <strong>Master Passcode</strong> is your local zero-knowledge decryption key.
              </div>
            </div>

            <div>
              <h4 style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>
                Can Custodian reset my Master Passcode?
              </h4>
              <p style={{ margin: 0, color: COLORS.textDim }}>
                No. Because Custodian is strictly <strong>Zero-Knowledge</strong>, your master passcode is never sent to our servers. We cannot reset it or decrypt your data if it is lost.
              </p>
            </div>

            <div>
              <h4 style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>
                Recommended Recovery Options:
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>
                  <strong>Emergency Recovery Kit:</strong> Search your downloads or files for <code>custodian-recovery-kit-*.txt</code> created during vault setup.
                </li>
                <li>
                  <strong>Another Active Device:</strong> If you are already unlocked on another computer or browser, you can export your secrets from there.
                </li>
                <li>
                  <strong>Forgot Account Password instead?</strong> If you forgot your login password, sign out and click "Forgot password?" on the sign-in screen.
                </li>
              </ul>
            </div>

            <button
              type="button"
              style={{ ...S.primaryBtn, justifyContent: "center", marginTop: 4 }}
              onClick={() => setShowForgotHelp(false)}
            >
              Got it
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

