import React, { useState, useEffect, useCallback } from "react";
import {
  Share2, ShieldCheck, UserCheck, Lock, Unlock, Eye, EyeOff, Copy, Check,
  Trash2, AlertTriangle, Clock, RefreshCw, Send, UserX, KeyRound, Sparkles, AtSign, User
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { receiveSharedSecret, importPublicKey } from "../crypto";
import { S, COLORS } from "../styles";

export default function SharedSecretsView({ userId, profile, ecdhPrivateKey, onOpenShareModal }) {
  const [subTab, setSubTab] = useState("received"); // received | sent
  const [receivedItems, setReceivedItems] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [decryptedCache, setDecryptedCache] = useState({}); // { [itemId]: decryptedObject }
  const [decryptingId, setDecryptingId] = useState(null);
  const [revealedFields, setRevealedFields] = useState({}); // { [fieldKey]: boolean }
  const [copiedKey, setCopiedKey] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const fetchSharedSecrets = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // 1. Fetch Received Items
      const { data: recData, error: recErr } = await supabase
        .from("shared_secrets")
        .select(`
          id,
          sender_id,
          recipient_id,
          title,
          category,
          encrypted_payload,
          secret_ciphertext,
          sender_public_key,
          sender_public_key_snapshot,
          created_at,
          revoked_at,
          sender:sender_id (id, email, username, display_name)
        `)
        .eq("recipient_id", userId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (recErr) throw recErr;
      setReceivedItems(recData || []);

      // 2. Fetch Sent Items
      const { data: sentData, error: sentErr } = await supabase
        .from("shared_secrets")
        .select(`
          id,
          sender_id,
          recipient_id,
          title,
          category,
          created_at,
          revoked_at,
          recipient:recipient_id (id, email, username, display_name)
        `)
        .eq("sender_id", userId)
        .order("created_at", { ascending: false });

      if (sentErr) throw sentErr;
      setSentItems(sentData || []);
    } catch (e) {
      console.error("[SharedSecretsView] Fetch error:", e);
      setErr(e.message || "Failed to load shared secrets.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSharedSecrets();
  }, [fetchSharedSecrets]);

  async function handleDecryptItem(item) {
    if (decryptedCache[item.id]) {
      // Already decrypted, toggle hide
      const next = { ...decryptedCache };
      delete next[item.id];
      setDecryptedCache(next);
      return;
    }

    if (!ecdhPrivateKey) {
      alert("Asymmetric private key not found in memory. Please lock and re-unlock your vault.");
      return;
    }

    setDecryptingId(item.id);
    try {
      const senderPubKey = item.sender_public_key_snapshot || item.sender_public_key;
      const cipherBlob = item.secret_ciphertext || item.encrypted_payload;
      const decrypted = await receiveSharedSecret(cipherBlob, senderPubKey, ecdhPrivateKey);
      setDecryptedCache((prev) => ({ ...prev, [item.id]: decrypted }));
    } catch (dErr) {
      console.error("[SharedSecretsView] Decryption error:", dErr);
      alert("Decryption failed. The secret may have been encrypted with an older key or modified.");
    } finally {
      setDecryptingId(null);
    }
  }

  async function handleRevokeSecret(item) {
    if (!confirm(`Revoke access to "${item.title}"? The recipient will immediately lose access.`)) return;
    setRevokingId(item.id);
    try {
      const { error } = await supabase
        .from("shared_secrets")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) throw error;
      setSentItems((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, revoked_at: new Date().toISOString() } : s))
      );
    } catch (rErr) {
      alert(rErr.message || "Failed to revoke secret.");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleDeleteReceived(item) {
    if (!confirm(`Delete shared secret "${item.title}" from your inbox?`)) return;
    try {
      const { error } = await supabase.from("shared_secrets").delete().eq("id", item.id);
      if (error) throw error;
      setReceivedItems((prev) => prev.filter((r) => r.id !== item.id));
    } catch (delErr) {
      alert(delErr.message || "Failed to delete item.");
    }
  }

  function handleCopy(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 24, overflowY: "auto" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Share2 size={20} color={COLORS.brass} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
              Zero-Knowledge Secret Sharing
            </h1>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(176,141,87,0.15)", color: COLORS.brass, border: `1px solid ${COLORS.brassBorder}` }}>
              ECDH P-256
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: 0, maxWidth: 650, lineHeight: 1.5 }}>
            End-to-end encrypted sharing. Secrets are encrypted on your device using the recipient's public key. 
            <strong> Custodian servers never see plaintext secrets.</strong> Free for all users.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{ ...S.secondaryBtn, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}
            onClick={fetchSharedSecrets}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            style={{ ...S.primaryBtn, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}
            onClick={onOpenShareModal}
          >
            <Send size={14} />
            Share Secret
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Received vs Sent */}
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            color: subTab === "received" ? COLORS.brass : COLORS.textDim,
            borderBottom: subTab === "received" ? `2px solid ${COLORS.brass}` : "2px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setSubTab("received")}
        >
          <Lock size={14} />
          Shared With Me ({receivedItems.length})
        </button>

        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            color: subTab === "sent" ? COLORS.brass : COLORS.textDim,
            borderBottom: subTab === "sent" ? `2px solid ${COLORS.brass}` : "2px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setSubTab("sent")}
        >
          <Send size={14} />
          Shared By Me ({sentItems.length})
        </button>
      </div>

      {err && (
        <div style={{ ...S.errBox, marginBottom: 16 }}>
          <AlertTriangle size={15} /> {err}
        </div>
      )}

      {/* Sub-Tab 1: Shared with Me (Received) */}
      {subTab === "received" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {receivedItems.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "48px 20px", background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <ShieldCheck size={36} color={COLORS.textFaint} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>No shared secrets received</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>
                When other developers share secrets with your username (@{profile?.username || "you"}), they will appear here.
              </div>
            </div>
          )}

          {receivedItems.map((item) => {
            const isDecrypted = !!decryptedCache[item.id];
            const decrypted = decryptedCache[item.id];
            const senderUser = item.sender || {};
            const senderName = senderUser.display_name || senderUser.username || senderUser.email || "Unknown Developer";
            const senderTag = senderUser.username ? `@${senderUser.username}` : senderUser.email;

            return (
              <div
                key={item.id}
                style={{
                  background: COLORS.cardBg,
                  border: `1px solid ${isDecrypted ? COLORS.brassBorder : COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0 }}>
                        {item.title}
                      </h3>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(176,141,87,0.12)", color: COLORS.brass }}>
                        {item.category || "SECRET"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>
                      <span>From:</span>
                      <strong style={{ color: COLORS.text }}>{senderName}</strong>
                      <span style={{ color: COLORS.brass, fontSize: 11 }}>({senderTag})</span>
                      <span>·</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      style={{
                        ...S.primaryBtn,
                        padding: "6px 12px",
                        fontSize: 12,
                        background: isDecrypted ? "rgba(176,141,87,0.2)" : COLORS.brass,
                        color: isDecrypted ? COLORS.brass : "#171615",
                        borderColor: COLORS.brassBorder,
                      }}
                      onClick={() => handleDecryptItem(item)}
                      disabled={decryptingId === item.id}
                    >
                      {decryptingId === item.id ? (
                        "Decrypting…"
                      ) : isDecrypted ? (
                        <>
                          <EyeOff size={13} style={{ marginRight: 4 }} /> Hide
                        </>
                      ) : (
                        <>
                          <Unlock size={13} style={{ marginRight: 4 }} /> Decrypt & Reveal
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      style={{ ...S.iconBtn, padding: 6, color: COLORS.textFaint }}
                      onClick={() => handleDeleteReceived(item)}
                      title="Delete from received"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Decrypted Secret Content */}
                {isDecrypted && decrypted && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
                    {decrypted.note && (
                      <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 10, fontStyle: "italic" }}>
                        Note: {decrypted.note}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(decrypted.fields || []).map((f, fIdx) => {
                        const fieldKey = `${item.id}_${fIdx}`;
                        const isRevealed = !!revealedFields[fieldKey];

                        return (
                          <div
                            key={fIdx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: COLORS.bg,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 6,
                              padding: "8px 12px",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim }}>{f.label || f.key || "Secret Value"}</span>
                              <span style={{ fontSize: 13, fontFamily: "monospace", color: COLORS.text, marginTop: 2 }}>
                                {isRevealed ? f.value : "••••••••••••••••••••"}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                style={S.iconBtn}
                                onClick={() => setRevealedFields((p) => ({ ...p, [fieldKey]: !p[fieldKey] }))}
                                title={isRevealed ? "Hide" : "Show"}
                              >
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>

                              <button
                                type="button"
                                style={S.iconBtn}
                                onClick={() => handleCopy(f.value, fieldKey)}
                                title="Copy to clipboard"
                              >
                                {copiedKey === fieldKey ? <Check size={13} color="#52B788" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Tab 2: Shared by Me (Sent) */}
      {subTab === "sent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sentItems.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "48px 20px", background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <Send size={36} color={COLORS.textFaint} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>No shared secrets sent yet</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>
                Click "Share Secret" to securely send API keys, credentials, or `.env` files to other developers.
              </div>
            </div>
          )}

          {sentItems.map((item) => {
            const isRevoked = !!item.revoked_at;
            const recipientUser = item.recipient || {};
            const recName = recipientUser.display_name || recipientUser.username || recipientUser.email || "Unknown";
            const recTag = recipientUser.username ? `@${recipientUser.username}` : recipientUser.email;

            return (
              <div
                key={item.id}
                style={{
                  background: COLORS.cardBg,
                  border: `1px solid ${isRevoked ? "rgba(224,122,109,0.3)" : COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  opacity: isRevoked ? 0.7 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0 }}>
                        {item.title}
                      </h3>
                      {isRevoked ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(224,122,109,0.15)", color: "#E07A6D" }}>
                          ACCESS REVOKED
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>
                      <span>Sent to:</span>
                      <strong style={{ color: COLORS.text }}>{recName}</strong>
                      <span style={{ color: COLORS.brass, fontSize: 11 }}>({recTag})</span>
                      <span>·</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {!isRevoked && (
                      <button
                        type="button"
                        style={{
                          ...S.secondaryBtn,
                          padding: "6px 12px",
                          fontSize: 12,
                          color: "#E07A6D",
                          borderColor: "rgba(224,122,109,0.4)",
                        }}
                        onClick={() => handleRevokeSecret(item)}
                        disabled={revokingId === item.id}
                      >
                        <UserX size={13} style={{ marginRight: 4 }} />
                        {revokingId === item.id ? "Revoking…" : "Revoke Access"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
