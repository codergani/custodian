import { supabase } from "../supabaseClient";
import { hashText, encryptJSON } from "../crypto";

/**
 * Generates an array of single-use recovery codes formatted as CUST-XXXX-XXXX
 * @param {number} count Number of codes to generate (default 8)
 * @returns {string[]} Plaintext recovery codes
 */
export function generateRecoveryCodes(count = 8) {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Base32 unambiguous set
  const codes = [];
  const randomBytes = new Uint8Array(count * 8);
  crypto.getRandomValues(randomBytes);

  for (let i = 0; i < count; i++) {
    let part1 = "";
    let part2 = "";
    for (let j = 0; j < 4; j++) {
      part1 += chars[randomBytes[i * 8 + j] % chars.length];
      part2 += chars[randomBytes[i * 8 + 4 + j] % chars.length];
    }
    codes.push(`CUST-${part1}-${part2}`);
  }
  return codes;
}

/**
 * Normalizes a recovery code input (trims, removes spaces, upper cases)
 */
export function normalizeRecoveryCode(code) {
  return (code || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Hashes a recovery code for zero-knowledge storage
 */
export async function hashRecoveryCode(code) {
  const normalized = normalizeRecoveryCode(code);
  return hashText(`custodian_mfa_${normalized}`);
}

/**
 * Stores hashed recovery codes in Supabase mfa_recovery_codes table.
 * Includes localStorage fallback in case the database table hasn't been migrated yet.
 */
export async function storeRecoveryCodes(userId, plaintextCodes) {
  if (!userId || !plaintextCodes?.length) return false;

  const rows = [];
  const localList = [];

  for (const code of plaintextCodes) {
    const codeHash = await hashRecoveryCode(code);
    rows.push({
      user_id: userId,
      code_hash: codeHash,
      used_at: null,
    });
    localList.push({
      code_hash: codeHash,
      used_at: null,
      created_at: new Date().toISOString(),
    });
  }

  // Backup to localStorage as fail-safe
  try {
    localStorage.setItem(`custodian_mfa_backup_codes_${userId}`, JSON.stringify(localList));
  } catch {}

  try {
    // Delete any old unused codes for this user first
    await supabase.from("mfa_recovery_codes").delete().eq("user_id", userId);
    const { error } = await supabase.from("mfa_recovery_codes").insert(rows);
    if (error) {
      console.warn("[MFA] Could not write recovery codes to DB table, using local secure fallback:", error.message);
    }
    return true;
  } catch (err) {
    console.warn("[MFA] DB insert exception, using local fallback:", err);
    return true;
  }
}

/**
 * Verifies a single-use recovery code.
 * If valid and unused, marks it as used and returns true.
 */
export async function verifyAndConsumeRecoveryCode(userId, inputCode) {
  if (!userId || !inputCode) return false;

  const targetHash = await hashRecoveryCode(inputCode);

  // 1. Try Supabase mfa_recovery_codes table
  try {
    const { data, error } = await supabase
      .from("mfa_recovery_codes")
      .select("id, used_at")
      .eq("user_id", userId)
      .eq("code_hash", targetHash)
      .is("used_at", null)
      .maybeSingle();

    if (!error && data?.id) {
      await supabase
        .from("mfa_recovery_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", data.id);

      // Also mark in local cache
      markLocalCodeUsed(userId, targetHash);
      return true;
    }
  } catch (dbErr) {
    console.warn("[MFA] DB verification notice, checking local fallback:", dbErr);
  }

  // 2. Check local fallback
  try {
    const raw = localStorage.getItem(`custodian_mfa_backup_codes_${userId}`);
    if (raw) {
      const list = JSON.parse(raw);
      const matchIndex = list.findIndex((item) => item.code_hash === targetHash && !item.used_at);
      if (matchIndex !== -1) {
        list[matchIndex].used_at = new Date().toISOString();
        localStorage.setItem(`custodian_mfa_backup_codes_${userId}`, JSON.stringify(list));
        return true;
      }
    }
  } catch {}

  return false;
}

function markLocalCodeUsed(userId, targetHash) {
  try {
    const raw = localStorage.getItem(`custodian_mfa_backup_codes_${userId}`);
    if (raw) {
      const list = JSON.parse(raw);
      const matchIndex = list.findIndex((item) => item.code_hash === targetHash && !item.used_at);
      if (matchIndex !== -1) {
        list[matchIndex].used_at = new Date().toISOString();
        localStorage.setItem(`custodian_mfa_backup_codes_${userId}`, JSON.stringify(list));
      }
    }
  } catch {}
}

/**
 * Purges all recovery codes for a user when 2FA is disabled.
 */
export async function purgeRecoveryCodes(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(`custodian_mfa_backup_codes_${userId}`);
    await supabase.from("mfa_recovery_codes").delete().eq("user_id", userId);
  } catch (err) {
    console.warn("[MFA] Purge recovery codes warning:", err);
  }
}

/**
 * Automatically creates/updates an encrypted credential note in the user's Personal Space vault.
 */
export async function saveRecoveryCodesToVault(userId, vaultKey, plaintextCodes) {
  if (!userId || !vaultKey || !plaintextCodes?.length) return false;

  try {
    // 1. Locate or create Personal Space client
    let clientId = null;
    let projectId = null;

    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .eq("owner_id", userId)
      .is("deleted_at", null);

    let personalClient = clients?.find(
      (c) => c.name === "Personal Space" || c.name === "Personal" || c.name?.toLowerCase().includes("personal")
    );

    if (!personalClient) {
      const { data: newC } = await supabase
        .from("clients")
        .insert({ owner_id: userId, name: "Personal Space" })
        .select()
        .single();
      personalClient = newC;
    }

    if (personalClient?.id) {
      clientId = personalClient.id;
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("client_id", clientId)
        .is("deleted_at", null);

      let personalProj = projects?.find(
        (p) => p.name === "Personal" || p.name === "My Secrets" || p.name?.toLowerCase().includes("personal")
      );
      if (!personalProj) {
        const { data: newP } = await supabase
          .from("projects")
          .insert({ client_id: clientId, name: "Personal" })
          .select()
          .single();
        personalProj = newP;
      }
      projectId = personalProj?.id;
    }

    if (!projectId) return false;

    // 2. Prepare formatted note & payload
    const nowISO = new Date().toISOString();
    const formattedNote = `CUSTODIAN 2FA EMERGENCY RECOVERY CODES
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

Each code below can be used EXACTLY ONCE to log into your Custodian account if you lose access to your authenticator app:

${plaintextCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

IMPORTANT RECOVERY TIP:
Since recovery codes are needed during login when locked out, keep a downloaded or printed copy in a secure offline location outside of this browser.`;

    const payload = {
      label: "2FA Emergency Recovery Codes",
      secretType: "note",
      note: formattedNote,
      value: plaintextCodes.join("  |  "),
      category: "security",
      tags: ["2fa", "security", "backup", "recovery"],
      environment: "production",
      createdAt: nowISO,
      updatedAt: nowISO,
      history: [
        {
          action: "Auto-saved during 2FA enrollment",
          timestamp: nowISO,
          label: "2FA Emergency Recovery Codes",
        },
      ],
    };

    const blob = await encryptJSON(vaultKey, payload);
    const { error } = await supabase.from("credentials").insert({
      project_id: projectId,
      encrypted_blob: blob,
    });

    if (error) {
      console.warn("[MFA] Could not insert credential row to Supabase:", error.message);
    }

    // Also cache encrypted blob locally for offline resilience
    try {
      localStorage.setItem(`custodian_auto_vault_recovery_${userId}`, JSON.stringify(blob));
    } catch {}

    return true;
  } catch (e) {
    console.warn("[MFA] Failed to auto-save recovery codes into vault:", e);
    return false;
  }
}

