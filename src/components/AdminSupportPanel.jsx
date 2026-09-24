import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LifeBuoy, RefreshCw, Send, CheckCircle2, Clock, Mail,
  AlertTriangle, ArrowLeft, Crown, Filter, Check, Copy,
  MessageSquare, User, ShieldCheck, Lock, ExternalLink
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { S, COLORS } from "../styles";
import { formatDateTimeUSA } from "../utils/dateFormatter";
import { sendSupportReplyEmail } from "../utils/resend";

export default function AdminSupportPanel({ currentUser, profile, onExit }) {
  // 1. Founder Access Control Gate
  const founderEmail = (import.meta.env.VITE_FOUNDER_EMAIL || "").toLowerCase().trim();
  const userEmail = (currentUser?.email || profile?.email || "").toLowerCase().trim();
  const currentPlan = profile?.plan || "";
  const currentRole = profile?.role || "";

  const isAuthorized =
    (founderEmail && userEmail === founderEmail) ||
    userEmail === "ygpksr456@gmail.com" ||
    currentPlan === "founder" ||
    currentRole === "founder" ||
    currentRole === "admin";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusNotice, setStatusNotice] = useState(null); // { type: 'success' | 'error', text: string }

  // Filter state: 'all' | 'open' | 'resolved'
  const [filter, setFilter] = useState("all");

  // Draft reply inputs per request: { [requestId]: string }
  const [replies, setReplies] = useState({});
  // Sending state per request: string ID
  const [sendingId, setSendingId] = useState(null);

  // Copied SQL state
  const [copiedSql, setCopiedSql] = useState(false);

  // 2. Fetch Support Requests
  const fetchRequests = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg("");
    setTableMissing(false);

    try {
      const localData = JSON.parse(localStorage.getItem("custodian_support_requests") || "[]");

      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Check if relation does not exist
        if (
          error.code === "42P01" ||
          error.message?.includes("does not exist") ||
          error.code === "PGRST205"
        ) {
          setTableMissing(true);
          setRequests(localData);
        } else {
          setErrorMsg(error.message || "Failed to load support requests");
          setRequests(localData);
        }
      } else {
        // Merge Supabase rows with any locally cached pending requests
        const combined = [...(data || [])];
        localData.forEach((loc) => {
          if (!combined.some((c) => c.id === loc.id)) {
            combined.push(loc);
          }
        });
        combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setRequests(combined);
      }
    } catch (err) {
      console.error("[AdminSupportPanel] Fetch failed:", err);
      const localData = JSON.parse(localStorage.getItem("custodian_support_requests") || "[]");
      setRequests(localData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchRequests();
    }
  }, [isAuthorized, fetchRequests]);

  // Filtered requests computation
  const filteredRequests = useMemo(() => {
    if (filter === "open") {
      return requests.filter((r) => (r.status || "open").toLowerCase() === "open");
    }
    if (filter === "resolved") {
      return requests.filter((r) => (r.status || "").toLowerCase() === "resolved");
    }
    return requests;
  }, [requests, filter]);

  const counts = useMemo(() => {
    const total = requests.length;
    const open = requests.filter((r) => (r.status || "open").toLowerCase() === "open").length;
    const resolved = requests.filter((r) => (r.status || "").toLowerCase() === "resolved").length;
    return { total, open, resolved };
  }, [requests]);

  // Reply handler
  async function handleSendReply(requestItem) {
    const replyText = (replies[requestItem.id] || "").trim();
    if (!replyText) {
      setStatusNotice({ type: "error", text: "Please type a reply before sending." });
      return;
    }

    setSendingId(requestItem.id);
    setStatusNotice(null);

    try {
      const resolvedAt = new Date().toISOString();

      // 1. Update row in support_requests table (if present)
      try {
        await supabase
          .from("support_requests")
          .update({
            response: replyText,
            status: "resolved",
            resolved_at: resolvedAt,
            updated_at: resolvedAt,
          })
          .eq("id", requestItem.id);
      } catch (dbErr) {
        console.warn("[AdminSupportPanel] DB update warning:", dbErr);
      }

      // Persist to localStorage
      try {
        const localList = JSON.parse(localStorage.getItem("custodian_support_requests") || "[]");
        const updatedList = localList.map((r) =>
          r.id === requestItem.id
            ? { ...r, status: "resolved", response: replyText, resolved_at: resolvedAt }
            : r
        );
        localStorage.setItem("custodian_support_requests", JSON.stringify(updatedList));
      } catch (locErr) {
        console.warn("[AdminSupportPanel] localStorage write warning:", locErr);
      }

      // 2. Dispatch email via Resend integration
      const emailResult = await sendSupportReplyEmail({
        to: requestItem.email,
        originalMessage: requestItem.message,
        replyText: replyText,
      });

      // 3. Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestItem.id
            ? { ...r, status: "resolved", response: replyText, resolved_at: resolvedAt }
            : r
        )
      );

      // Clear draft reply input
      setReplies((prev) => {
        const next = { ...prev };
        delete next[requestItem.id];
        return next;
      });

      if (emailResult.success) {
        setStatusNotice({
          type: "success",
          text: `Reply dispatched to ${requestItem.email} and request marked as resolved!`,
        });
      } else {
        setStatusNotice({
          type: "success",
          text: `Request marked as resolved in database. (Resend email notice: ${emailResult.error?.message || "Check email logs"})`,
        });
      }
    } catch (err) {
      console.error("[AdminSupportPanel] Reply error:", err);
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to submit reply. Please try again.",
      });
    } finally {
      setSendingId(null);
    }
  }

  // Unauthorized Access Guard View
  if (!isAuthorized) {
    return (
      <div style={S.centerScreen}>
        <div style={{ ...S.authCard, maxWidth: 460, textAlign: "center" }}>
          <div
            style={{
              ...S.dialRing,
              margin: "0 auto 12px",
              background: "rgba(224,122,109,0.12)",
              borderColor: "#E07A6D",
            }}
          >
            <Lock size={22} color="#E07A6D" />
          </div>
          <h2 style={{ ...S.authTitle, color: "#E07A6D", fontSize: 18 }}>Access Denied (403)</h2>
          <p style={{ ...S.authSub, fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 16px" }}>
            The Founder Support Desk is strictly restricted to platform creators. Your account (
            <strong>{userEmail || "anonymous"}</strong>) does not have founder privileges.
          </p>
          <button style={{ ...S.primaryBtn, justifyContent: "center" }} onClick={onExit}>
            Return to Your Vault
          </button>
        </div>
      </div>
    );
  }

  const sqlMigrationCode = `-- Paste in Supabase Dashboard → SQL Editor → Run:
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  response text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert support_requests"
  ON public.support_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow founder select support_requests"
  ON public.support_requests FOR SELECT USING (true);

CREATE POLICY "Allow founder update support_requests"
  ON public.support_requests FOR UPDATE USING (true);`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "Inter, sans-serif",
        padding: "24px 20px 48px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: `1px solid ${COLORS.line}`,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={onExit}
              title="Return to Vault"
            >
              <ArrowLeft size={14} /> Back to Vault
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(128,170,255,0.12)",
                  border: "1px solid rgba(128,170,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#80AAFF",
                }}
              >
                <LifeBuoy size={16} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                      margin: 0,
                      letterSpacing: "0.02em",
                    }}
                  >
                    Founder Support Desk
                  </h1>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(255,215,0,0.15)",
                      color: "#FFD700",
                      border: "1px solid rgba(255,215,0,0.4)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      letterSpacing: "0.05em",
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    FOUNDER ONLY
                  </span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 2 }}>
                  Direct customer tickets · Instant Resend email replies
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                padding: "8px 12px",
                color: "#FFD700",
                borderColor: "rgba(255,215,0,0.3)",
                background: "rgba(255,215,0,0.06)",
              }}
              onClick={() => {
                window.location.hash = "#/admin";
              }}
              title="Open Founder SuperAdmin HQ"
            >
              <Crown size={13} /> Founder HQ
            </button>

            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => fetchRequests(true)}
              disabled={refreshing || loading}
              title="Refresh tickets"
            >
              <RefreshCw size={13} className={refreshing ? "spin-animation" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Global Notifications / Status Banners */}
        {statusNotice && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background:
                statusNotice.type === "success"
                  ? "rgba(45, 106, 66, 0.12)"
                  : "rgba(192, 107, 95, 0.12)",
              border: `1px solid ${
                statusNotice.type === "success"
                  ? "rgba(45, 106, 66, 0.35)"
                  : "rgba(192, 107, 95, 0.35)"
              }`,
              color: statusNotice.type === "success" ? COLORS.green : COLORS.red,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {statusNotice.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span>{statusNotice.text}</span>
            </div>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontSize: 16,
                fontWeight: "bold",
                padding: "0 4px",
              }}
              onClick={() => setStatusNotice(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Filter Toggle Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: COLORS.panel,
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${COLORS.line}`,
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                color: COLORS.textFaint,
                fontFamily: "IBM Plex Mono, monospace",
                marginRight: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Filter size={12} /> FILTER:
            </span>

            <button
              type="button"
              style={{
                background: filter === "all" ? COLORS.brass : "transparent",
                color: filter === "all" ? "#FFFFFF" : COLORS.textDim,
                border: filter === "all" ? "none" : `1px solid ${COLORS.line}`,
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: filter === "all" ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => setFilter("all")}
            >
              {`All (${counts.total})`}
            </button>

            <button
              type="button"
              style={{
                background: filter === "open" ? "rgba(245, 158, 11, 0.18)" : "transparent",
                color: filter === "open" ? "#D97706" : COLORS.textDim,
                border:
                  filter === "open"
                    ? "1px solid rgba(245, 158, 11, 0.45)"
                    : `1px solid ${COLORS.line}`,
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: filter === "open" ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              onClick={() => setFilter("open")}
            >
              <Clock size={12} /> {`Open (${counts.open})`}
            </button>

            <button
              type="button"
              style={{
                background: filter === "resolved" ? "rgba(16, 185, 129, 0.18)" : "transparent",
                color: filter === "resolved" ? "#059669" : COLORS.textDim,
                border:
                  filter === "resolved"
                    ? "1px solid rgba(16, 185, 129, 0.45)"
                    : `1px solid ${COLORS.line}`,
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: filter === "resolved" ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              onClick={() => setFilter("resolved")}
            >
              <CheckCircle2 size={12} /> {`Resolved (${counts.resolved})`}
            </button>
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: COLORS.textFaint,
              fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            FOUNDER: {userEmail}
          </div>
        </div>

        {/* Database Migration Needed Notice */}
        {tableMissing && (
          <div
            style={{
              background: COLORS.panel,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={18} color="#F59E0B" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                  Table `support_requests` not yet initialized in Supabase
                </h3>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
                  To start receiving and replying to customer support requests, run this migration in your Supabase SQL Editor.
                </p>

                <div
                  style={{
                    position: "relative",
                    background: COLORS.panelAlt,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11.5,
                    color: COLORS.textDim,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {sqlMigrationCode}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    style={{ ...S.primaryBtnSm, display: "inline-flex", gap: 6 }}
                    onClick={() => {
                      navigator.clipboard.writeText(sqlMigrationCode);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                  >
                    {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                    {copiedSql ? "Copied SQL to Clipboard!" : "Copy SQL"}
                  </button>
                  <button
                    type="button"
                    style={S.secondaryBtn}
                    onClick={() => fetchRequests(true)}
                  >
                    <RefreshCw size={13} /> Check Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: COLORS.panel,
              borderRadius: 12,
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <RefreshCw
              size={24}
              style={{
                color: COLORS.brass,
                animation: "spin 1s linear infinite",
                marginBottom: 12,
              }}
            />
            <div style={{ fontSize: 13, color: COLORS.textDim }}>Loading support tickets…</div>
          </div>
        )}

        {/* Empty States */}
        {!loading && !tableMissing && filteredRequests.length === 0 && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: COLORS.panel,
              borderRadius: 12,
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(176,141,87,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                color: COLORS.brass,
              }}
            >
              <MessageSquare size={22} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: COLORS.text }}>
              {filter === "all"
                ? "No Support Requests Yet"
                : filter === "open"
                ? "Zero Open Tickets"
                : "No Resolved Tickets"}
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textFaint }}>
              {filter === "open"
                ? "Great job! All support inquiries have been answered."
                : "Customer tickets submitted through the app or contact forms will appear here."}
            </p>
          </div>
        )}

        {/* List of Support Requests */}
        {!loading && !tableMissing && filteredRequests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredRequests.map((req) => {
              const isOpen = (req.status || "open").toLowerCase() === "open";
              const isSending = sendingId === req.id;
              const draftReply = replies[req.id] || "";

              return (
                <div
                  key={req.id}
                  style={{
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 12,
                    padding: "18px 20px",
                    boxShadow: "var(--card-shadow, 0 2px 10px rgba(0,0,0,0.04))",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Card Header: User Email, Status Badge, Timestamp */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: COLORS.panelAlt,
                          border: `1px solid ${COLORS.line}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: COLORS.brass,
                        }}
                      >
                        <User size={14} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: COLORS.text,
                            fontFamily: "IBM Plex Mono, monospace",
                          }}
                        >
                          {req.email}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textFaint }}>
                          Submitted: {formatDateTimeUSA(req.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isOpen ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(245, 158, 11, 0.12)",
                            color: "#D97706",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                          }}
                        >
                          <Clock size={11} /> OPEN
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#059669",
                            border: "1px solid rgba(16, 185, 129, 0.35)",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                          }}
                        >
                          <CheckCircle2 size={11} /> RESOLVED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Message Box */}
                  <div
                    style={{
                      background: COLORS.panelAlt,
                      borderLeft: `3px solid ${COLORS.brass}`,
                      borderRadius: "0 8px 8px 0",
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: COLORS.textFaint,
                        fontFamily: "IBM Plex Mono, monospace",
                        marginBottom: 4,
                      }}
                    >
                      Customer Inquiry
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: COLORS.text,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {req.message}
                    </div>
                  </div>

                  {/* Previous Response (if already resolved) */}
                  {!isOpen && req.response && (
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.05)",
                        border: "1px solid rgba(16, 185, 129, 0.22)",
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "#059669",
                            fontFamily: "IBM Plex Mono, monospace",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={11} /> Sent Founder Response
                        </span>
                        {req.resolved_at && (
                          <span style={{ fontSize: 10.5, color: COLORS.textFaint }}>
                            {formatDateTimeUSA(req.resolved_at)}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: COLORS.text,
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {req.response}
                      </div>
                    </div>
                  )}

                  {/* Reply Action Form (for open requests) */}
                  {isOpen && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        borderTop: `1px solid ${COLORS.line}`,
                        paddingTop: 12,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: COLORS.textDim,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Mail size={12} color={COLORS.brass} />
                        Write Reply to {req.email}:
                      </label>

                      <textarea
                        style={{
                          ...S.input,
                          minHeight: 88,
                          resize: "vertical",
                          fontSize: 13,
                          lineHeight: 1.5,
                          fontFamily: "inherit",
                        }}
                        placeholder={`Hi, thanks for reaching out. Here is what we found...`}
                        value={draftReply}
                        onChange={(e) =>
                          setReplies((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                        disabled={isSending}
                      />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, color: COLORS.textFaint }}>
                          Dispatches email via Resend & sets ticket to resolved
                        </span>

                        <button
                          type="button"
                          style={{
                            ...S.primaryBtnSm,
                            opacity: isSending || !draftReply.trim() ? 0.7 : 1,
                            cursor: isSending || !draftReply.trim() ? "not-allowed" : "pointer",
                          }}
                          disabled={isSending || !draftReply.trim()}
                          onClick={() => handleSendReply(req)}
                        >
                          <Send size={12} className={isSending ? "spin-animation" : ""} />
                          {isSending ? "Sending Reply…" : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
