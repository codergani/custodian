/**
 * Shared UI primitives used across Custodian components.
 * Extracted from Vault.jsx for maintainability.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Check, ChevronDown, X, Eye, EyeOff, Copy, Edit3, Trash2, Share2,
  Clock, RefreshCw, ExternalLink, CheckCircle, AlertTriangle, HelpCircle, ShieldCheck,
  History, Calendar, FileText
} from "lucide-react";
import { S, COLORS } from "../styles";
import { formatDateUSA, formatDateTimeUSA } from "../utils/dateFormatter";

// ──── Custom Dropdown ────
export function CustomDropdown({ value, onChange, options, style, buttonStyle, dropdownStyle, placeholder = "Select option..." }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOpt = options.find((o) => (typeof o === "object" ? o.value === value : o === value));
  const selectedLabel = typeof selectedOpt === "object" ? selectedOpt.label : selectedOpt || value || placeholder;

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          boxSizing: "border-box",
          width: "100%",
          background: COLORS.panelAlt,
          border: `1px solid ${open ? COLORS.brass : COLORS.line}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: COLORS.text,
          fontSize: 12.5,
          fontFamily: "Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          textAlign: "left",
          transition: "border-color 0.15s, background 0.15s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          ...buttonStyle,
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: value ? COLORS.text : COLORS.textFaint }}>
          {selectedLabel}
        </span>
        <ChevronDown size={14} color={COLORS.textDim} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 8,
            boxShadow: "0 10px 32px rgba(0,0,0,0.22)",
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            maxHeight: 220,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            minWidth: "100%",
            ...dropdownStyle,
          }}
        >
          {options.map((opt) => {
            const val = typeof opt === "object" ? opt.value : opt;
            const label = typeof opt === "object" ? opt.label : opt;
            const isSelected = val === value;
            return (
              <div
                key={val}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 12.5,
                  fontFamily: "Inter, sans-serif",
                  color: isSelected ? COLORS.brass : COLORS.text,
                  background: isSelected ? "var(--highlight-bg, rgba(148,110,55,0.12))" : "transparent",
                  fontWeight: isSelected ? 600 : 400,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = COLORS.panelAlt;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { onChange(val); setOpen(false); }
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                {isSelected && <Check size={13} color={COLORS.brass} style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──── Toggle Switch ────
export function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) onChange(!checked); }}
      style={{
        width: 36, height: 20, borderRadius: 10, padding: 2, cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? COLORS.brass : "rgba(255,255,255,0.12)",
        transition: "background 0.2s ease",
        display: "flex", alignItems: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div
        style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transform: checked ? "translateX(16px)" : "translateX(0)",
          transition: "transform 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

// ──── Renewal Info Calculator ────
export function getNextRenewalInfo(renewalDate, frequency = "monthly", reminderDays = 1, alertIntent = "review_cancel", isCanceled = false) {
  if (!renewalDate) return null;
  if (isCanceled) {
    return { isCanceled: true, urgency: "canceled", frequency };
  }

  const [y, m, d] = renewalDate.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 2000 || y > 2099) return null;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Advance target until it's in the future
  while (target < now) {
    if (frequency === "annual" || frequency === "yearly") {
      target.setFullYear(target.getFullYear() + 1);
    } else {
      target.setMonth(target.getMonth() + 1);
    }
  }

  const diffMs = target.getTime() - now.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rDays = Number(reminderDays) || 1;

  let urgency = "active";
  if (alertIntent === "permanent_auto") urgency = "permanent";
  else if (daysUntil === 0) urgency = "today";
  else if (daysUntil <= rDays) urgency = "imminent";
  else if (daysUntil <= 7) urgency = "upcoming";

  return {
    nextDate: target.toISOString().slice(0, 10),
    daysUntil,
    daysRemaining: daysUntil,
    urgency,
    frequency,
    alertIntent,
    targetDate: target,
  };
}

// ──── Overlay (Modal Wrapper) ────
export function Overlay({ onClose, title, icon, children, cardStyle }) {
  return (
    <div style={S.overlay} className="custodian-modal-overlay" onClick={onClose}>
      <div style={cardStyle || S.modalCard} className="custodian-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div style={S.authHeader}><div style={S.dialRing}>{icon}</div><h2 style={S.authTitle}>{title}</h2></div>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ──── Elegant Confirmation Modal ────
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  icon,
  children,
}) {
  if (!isOpen) return null;

  return (
    <Overlay
      onClose={onClose}
      title={title}
      icon={icon || (isDanger ? <AlertTriangle size={18} color="#E07A6D" /> : <HelpCircle size={18} color={COLORS.brass} />)}
      cardStyle={{ ...S.modalCard, maxWidth: 440 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {message && (
          <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.55, margin: 0 }}>
            {message}
          </p>
        )}
        {children}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button type="button" style={S.secondaryBtn} onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            style={isDanger ? S.dangerBtn : S.primaryBtn}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ──── Elegant Input / Typed Prompt Modal ────
export function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  placeholder = "",
  defaultValue = "",
  confirmPhrase,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  icon,
}) {
  const [val, setVal] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setVal(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const isMatched = confirmPhrase ? val.trim().toUpperCase() === confirmPhrase.toUpperCase() : Boolean(val.trim());

  function handleSubmit(e) {
    e?.preventDefault();
    if (!isMatched) return;
    onConfirm(val.trim());
    onClose();
  }

  return (
    <Overlay
      onClose={onClose}
      title={title}
      icon={icon || (isDanger ? <AlertTriangle size={18} color="#E07A6D" /> : <HelpCircle size={18} color={COLORS.brass} />)}
      cardStyle={{ ...S.modalCard, maxWidth: 450 }}
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {message && (
          <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.55, margin: 0 }}>
            {message}
          </p>
        )}
        {confirmPhrase && (
          <div style={{ fontSize: 12, color: COLORS.textDim }}>
            Type <strong style={{ color: isDanger ? "#E07A6D" : COLORS.brass, letterSpacing: "0.05em" }}>{confirmPhrase}</strong> to confirm:
          </div>
        )}
        <input
          style={{ ...S.input, borderColor: isDanger && confirmPhrase && val.toUpperCase() === confirmPhrase ? "#E07A6D" : undefined }}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder || (confirmPhrase ? `Type '${confirmPhrase}'` : "")}
          autoFocus
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" style={S.secondaryBtn} onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={!isMatched}
            style={{
              ...(isDanger ? S.dangerBtn : S.primaryBtn),
              opacity: isMatched ? 1 : 0.5,
              cursor: isMatched ? "pointer" : "not-allowed",
            }}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ──── Credential Card ────
export function CredCard({ cred, revealed, onReveal, onCopy, copiedId, onEdit, onDelete, onShare }) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const renewal = cred.renewalInfo;
  const cost = parseFloat(cred.cost);
  const currency = cred.currency || "$";
  const env = cred.environment || "global";
  const secretType = cred.secretType || "env_var";

  const envBadgeStyle =
    env === "prod" ? S.envBadgeProd
    : env === "staging" ? S.envBadgeStaging
    : env === "dev" ? S.envBadgeDev
    : S.envBadgeGlobal;

  const envLabel =
    env === "prod" ? "PROD"
    : env === "staging" ? "STAGING"
    : env === "dev" ? "DEV"
    : "GLOBAL";

  const typeConfig = {
    note: { label: "📝 SECURE NOTE / CODES", color: "#10B981" },
    login: { label: "📧 LOGIN", color: "#00D2FF" },
    pin: { label: "📱 PASSCODE", color: "#F43F5E" },
    card: { label: "💳 CARD & BANK", color: "#F59E0B" },
    database: { label: "🗄️ DATABASE", color: "#8B5CF6" },
    api_key: { label: "🔑 API KEY", color: "#00D2FF" },
    ssh: { label: "🔒 SSH KEY", color: "#EC4899" },
    supabase: { label: "⚡ SUPABASE", color: "#10B981" },
    stripe: { label: "💳 STRIPE", color: "#6366F1" },
    aws: { label: "☁️ AWS", color: "#F59E0B" },
    jwt: { label: "🎫 JWT", color: "#3B82F6" },
    env_var: { label: "📦 ENV VAR", color: "#94A3B8" },
    generic: { label: "🌐 SECRET", color: "#94A3B8" },
  }[secretType] || { label: "📦 SECRET", color: "#94A3B8" };

  const keyName = (cred.username || cred.label || "KEY").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const rawSecret = cred.password || "";

  return (
    <div className="aegis-card" style={S.credCard}>
      <div style={S.credCardTop}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={S.credLabel}>{cred.label}</span>
            <span style={envBadgeStyle}>{envLabel}</span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: typeConfig.color, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "JetBrains Mono, monospace" }}>
              {typeConfig.label}
            </span>
          </div>

          {cred.isCanceled ? (
            <span style={S.canceledBadge}>
              <CheckCircle size={11} /> Canceled (Saved {currency}{!isNaN(cost) ? cost.toFixed(2) : "0.00"}/mo)
            </span>
          ) : renewal ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
              <span
                style={
                  renewal.urgency === "permanent" ? S.urgencyPillActive
                  : renewal.urgency === "critical" ? S.urgencyPillCritical
                  : renewal.urgency === "warning" ? S.urgencyPillWarning
                  : S.urgencyPillActive
                }
              >
                {renewal.urgency === "permanent" ? (
                  <><RefreshCw size={11} /> Auto-renews {renewal.nextDate}</>
                ) : (
                  <>
                    <Clock size={11} />
                    {renewal.daysRemaining <= 0
                      ? "Renews Today!"
                      : renewal.daysRemaining === 1
                      ? "Renews Tomorrow!"
                      : `Renews in ${renewal.daysRemaining}d (${renewal.nextDate})`}
                  </>
                )}
              </span>
              {!isNaN(cost) && cost > 0 && (
                <span style={{ fontSize: 11, color: COLORS.brass, fontFamily: "IBM Plex Mono, monospace" }}>
                  {currency}{cost.toFixed(2)}/{cred.billingFrequency === "yearly" ? "yr" : "mo"}
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {cred.cancelUrl && !cred.isCanceled && (
            <a href={cred.cancelUrl} target="_blank" rel="noopener noreferrer" style={S.portalBtn} title="Open billing portal">
              <ExternalLink size={11} /> Portal
            </a>
          )}
          {onShare && (
            <button
              style={{ ...S.iconBtnGhost, color: COLORS.brass }}
              onClick={onShare}
              title="Share Secret (Zero-Knowledge ECDH)"
              aria-label="Share Secret"
            >
              <Share2 size={13} />
            </button>
          )}
          <button style={S.iconBtnGhost} onClick={onEdit} title="Edit credential" aria-label="Edit credential"><Edit3 size={13} /></button>
          <button style={S.iconBtnGhost} onClick={onDelete} title="Move to Trash" aria-label="Delete credential"><Trash2 size={13} /></button>
        </div>
      </div>

      {secretType === "note" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {/* Optional Account / Identifier Tag (if present) */}
          {cred.username && cred.username !== "Recovery Words" && (
            <FieldRow
              label="Account / Tag"
              value={cred.username}
              onCopy={onCopy}
              copyKey={cred.id + "-u"}
              copiedId={copiedId}
            />
          )}

          {/* Dedicated Note / Backup Codes Container */}
          <div
            style={{
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Header with reveal & copy */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: COLORS.brass }}>
                <FileText size={12} />
                <span>ENCRYPTED BACKUP CODES / TEXT</span>
                {cred.password && (
                  <span style={{ fontSize: 10, color: COLORS.textFaint, fontWeight: 400, fontFamily: "IBM Plex Mono, monospace" }}>
                    {`(${cred.password.split("\n").filter((l) => l.trim().length > 0).length} codes / lines)`}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  style={{ ...S.iconBtnGhost, fontSize: 11, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onClick={onReveal}
                  title={revealed ? "Hide codes" : "Reveal codes"}
                >
                  {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{revealed ? "Hide" : "Reveal"}</span>
                </button>
                <button
                  type="button"
                  style={{
                    ...S.actionChipBtn,
                    fontSize: 11,
                    padding: "3px 9px",
                    background: copiedId === cred.id + "-p" ? "rgba(22,163,74,0.18)" : "rgba(176,141,87,0.14)",
                    borderColor: copiedId === cred.id + "-p" ? "#16A34A" : COLORS.brassDim,
                    color: copiedId === cred.id + "-p" ? "#16A34A" : COLORS.brass,
                    fontWeight: 600,
                  }}
                  onClick={() => onCopy(cred.password, cred.id + "-p")}
                  title="Copy all backup codes to clipboard"
                >
                  {copiedId === cred.id + "-p" ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                  <span>{copiedId === cred.id + "-p" ? "Copied All!" : "Copy All"}</span>
                </button>
              </div>
            </div>

            {/* Codes Content Box */}
            <div
              style={{
                background: COLORS.bg || "rgba(0,0,0,0.15)",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 6,
                padding: "8px 10px",
                maxHeight: 220,
                overflowY: "auto",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 12,
                lineHeight: 1.6,
                color: COLORS.text,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                userSelect: revealed ? "text" : "none",
              }}
            >
              {revealed ? (
                cred.password ? (
                  cred.password.split("\n").map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "2px 0",
                        borderBottom: idx < cred.password.split("\n").length - 1 ? `1px dashed rgba(255,255,255,0.05)` : "none",
                      }}
                    >
                      <span style={{ display: "inline-block", width: 24, color: COLORS.textFaint, fontSize: 10.5, userSelect: "none" }}>
                        {idx + 1}.
                      </span>
                      <span style={{ flex: 1, letterSpacing: "0.03em" }}>{line}</span>
                      {line.trim() && (
                        <button
                          type="button"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: copiedId === `${cred.id}-line-${idx}` ? "#16A34A" : COLORS.textFaint,
                            cursor: "pointer",
                            padding: "1px 4px",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                          onClick={() => onCopy(line.trim(), `${cred.id}-line-${idx}`)}
                          title="Copy this single code"
                        >
                          {copiedId === `${cred.id}-line-${idx}` ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <span style={{ color: COLORS.textFaint, fontStyle: "italic" }}>No content saved.</span>
                )
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0", opacity: 0.65 }}>
                  {Array.from({ length: Math.min(Math.max((cred.password || "").split("\n").length, 3), 8) }).map((_, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 24, color: COLORS.textFaint, fontSize: 10.5 }}>{i + 1}.</span>
                      <span style={{ letterSpacing: "0.2em", color: COLORS.textDim }}>•••••••• ••••••••</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10.5, color: COLORS.textFaint, marginTop: 4, fontStyle: "italic", textAlign: "center" }}>
                    Click &ldquo;Reveal&rdquo; to unmask all encrypted backup codes
                  </div>
                </div>
              )}
            </div>
          </div>

          {cred.url && (
            <FieldRow
              label="Docs / URL"
              value={cred.url}
              onCopy={onCopy}
              copyKey={cred.id + "-l"}
              copiedId={copiedId}
            />
          )}
        </div>
      ) : (
        <>
          <FieldRow label="Key / Name" value={cred.username || cred.label} onCopy={onCopy} copyKey={cred.id + "-u"} copiedId={copiedId} />
          <FieldRow
            label="Secret Value" value={revealed ? cred.password : "••••••••••••"} secret revealed={revealed}
            onToggle={onReveal} onCopy={() => onCopy(cred.password, cred.id + "-p")} copyKey={cred.id + "-p"} copiedId={copiedId}
          />
          {cred.url && <FieldRow label="Docs / URL" value={cred.url} onCopy={onCopy} copyKey={cred.id + "-l"} copiedId={copiedId} />}

          {/* Developer Quick-Action Format Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${COLORS.line}`, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: COLORS.textFaint, marginRight: 2 }}>COPY AS:</span>
            <button
              type="button"
              style={{ ...S.actionChipBtn, fontSize: 10, padding: "1px 6px" }}
              onClick={() => onCopy(rawSecret, cred.id + "-raw")}
              title="Copy raw secret value"
            >
              {copiedId === cred.id + "-raw" ? <Check size={10} color="#8FA98C" /> : null}
              <span>{copiedId === cred.id + "-raw" ? "Copied" : "RAW"}</span>
            </button>
            <button
              type="button"
              style={{ ...S.actionChipBtn, fontSize: 10, padding: "1px 6px" }}
              onClick={() => onCopy(`${keyName}=${rawSecret}`, cred.id + "-env")}
              title="Copy as KEY=VALUE"
            >
              {copiedId === cred.id + "-env" ? <Check size={10} color="#8FA98C" /> : null}
              <span>{copiedId === cred.id + "-env" ? "Copied" : ".ENV"}</span>
            </button>
            <button
              type="button"
              style={{ ...S.actionChipBtn, fontSize: 10, padding: "1px 6px" }}
              onClick={() => onCopy(`export ${keyName}="${rawSecret.replace(/"/g, '\\"')}"`, cred.id + "-bash")}
              title="Copy as export KEY=VAL"
            >
              {copiedId === cred.id + "-bash" ? <Check size={10} color="#8FA98C" /> : null}
              <span>{copiedId === cred.id + "-bash" ? "Copied" : "BASH"}</span>
            </button>
            <button
              type="button"
              style={{ ...S.actionChipBtn, fontSize: 10, padding: "1px 6px" }}
              onClick={() => onCopy(`-e ${keyName}="${rawSecret.replace(/"/g, '\\"')}"`, cred.id + "-docker")}
              title="Copy as Docker flag -e KEY=VAL"
            >
              {copiedId === cred.id + "-docker" ? <Check size={10} color="#8FA98C" /> : null}
              <span>{copiedId === cred.id + "-docker" ? "Copied" : "DOCKER"}</span>
            </button>
            <button
              type="button"
              style={{ ...S.actionChipBtn, fontSize: 10, padding: "1px 6px" }}
              onClick={() => onCopy(JSON.stringify({ [keyName]: rawSecret }, null, 2), cred.id + "-json")}
              title="Copy as JSON object"
            >
              {copiedId === cred.id + "-json" ? <Check size={10} color="#8FA98C" /> : null}
              <span>{copiedId === cred.id + "-json" ? "Copied" : "JSON"}</span>
            </button>
          </div>
        </>
      )}

      {/* Secret Timeline & Modification Metadata (USA Format: MM/DD/YYYY • HH:MM) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTop: `1px solid ${COLORS.line}`, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.textFaint, position: "relative" }}>
          <Clock size={11} color={COLORS.brass} />
          <span style={{ color: COLORS.text, fontWeight: 500 }}>
            {cred.updatedAt ? `Updated: ${formatDateTimeUSA(cred.updatedAt)}` : cred.createdAt ? `Created: ${formatDateTimeUSA(cred.createdAt)}` : "Created: N/A"}
          </span>

          {/* "i" in a Circle Info Button (Hover on Desktop, Tap/Click on Mobile) */}
          <div
            style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
            onMouseEnter={() => setShowFormatInfo(true)}
            onMouseLeave={() => setShowFormatInfo(false)}
          >
            <button
              type="button"
              style={{
                background: showFormatInfo ? "rgba(176,141,87,0.25)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${showFormatInfo ? COLORS.brass : COLORS.line}`,
                borderRadius: "50%",
                width: 16,
                height: 16,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: showFormatInfo ? COLORS.brass : COLORS.textDim,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "serif",
                lineHeight: 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowFormatInfo(!showFormatInfo);
              }}
              title="Click or hover to view date & time format details"
              aria-label="Date and time format details"
            >
              i
            </button>

            {/* Floating Tooltip / Popover */}
            {showFormatInfo && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(22, 19, 15, 0.97)",
                  border: "1px solid rgba(176, 141, 87, 0.75)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  color: "#FAF8F5",
                  fontSize: 10.5,
                  whiteSpace: "nowrap",
                  zIndex: 9999,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 175,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontWeight: 700, color: "#D4AF37", fontSize: 9.5, letterSpacing: "0.05em", borderBottom: "1px solid rgba(176,141,87,0.3)", paddingBottom: 3 }}>
                  USA STANDARD FORMAT
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: "#C5BEB3" }}>
                  <span>📅 Date:</span>
                  <strong style={{ color: "#FFFFFF", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.02em" }}>MM/DD/YYYY</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: "#C5BEB3" }}>
                  <span>⏰ Time:</span>
                  <strong style={{ color: "#FFFFFF", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.02em" }}>HH:MM AM/PM</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          style={{
            background: showTimeline ? "rgba(176,141,87,0.15)" : "transparent",
            border: `1px solid ${showTimeline ? COLORS.brass : COLORS.line}`,
            borderRadius: 4,
            color: showTimeline ? COLORS.brass : COLORS.textDim,
            fontSize: 10.5,
            padding: "2px 7px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          onClick={() => setShowTimeline(!showTimeline)}
          title="View Update Timeline"
        >
          <History size={11} /> {showTimeline ? "Hide Timeline" : "Timeline"}
        </button>
      </div>

      {/* Expandable Chronological Timeline */}
      {showTimeline && (
        <div style={{ marginTop: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.brass, letterSpacing: "0.04em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>AUDIT TIMELINE</span>
            <span style={{ fontSize: 9.5, color: COLORS.textFaint, fontWeight: 400, fontFamily: "IBM Plex Mono, monospace" }}>MM/DD/YYYY • HH:MM</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(Array.isArray(cred.history) && cred.history.length > 0 ? cred.history : [
              ...(cred.createdAt ? [{ action: "Created", timestamp: cred.createdAt }] : []),
              ...(cred.updatedAt && cred.updatedAt !== cred.createdAt ? [{ action: "Updated", timestamp: cred.updatedAt }] : []),
            ]).map((entry, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: idx < (cred.history?.length || 1) - 1 ? `1px dashed ${COLORS.line}` : "none" }}>
                <span style={{ color: entry.action === "Created" ? "#8FA98C" : COLORS.brass, fontWeight: 500 }}>
                  • {entry.action || "Updated"}
                </span>
                <span style={{ color: COLORS.textDim, fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5 }}>
                  {formatDateTimeUSA(entry.timestamp)}
                </span>
              </div>
            ))}
            {(!cred.history || cred.history.length === 0) && !cred.createdAt && !cred.updatedAt && (
              <div style={{ fontSize: 11, color: COLORS.textFaint, fontStyle: "italic" }}>
                No prior revision timeline recorded for this secret.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──── Field Row ────
export function FieldRow({ label, value, secret, revealed, onToggle, copyKey, onCopy, copiedId }) {
  return (
    <div style={S.fieldRow}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={{ ...S.fieldValue, ...S.mono }}>{value}</div>
      <div style={S.fieldActions}>
        {secret && <button style={S.iconBtnGhost} onClick={onToggle} aria-label={revealed ? "Hide password" : "Show password"}>{revealed ? <EyeOff size={13} /> : <Eye size={13} />}</button>}
        <button style={S.iconBtnGhost} onClick={() => onCopy(value, copyKey)} disabled={secret && !revealed} aria-label={`Copy ${label}`}>
          {copiedId === copyKey ? <Check size={13} color="#8FA98C" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

// ──── Security Health Calculator ────
export function calculateSecurityHealth(creds = []) {
  const safeCreds = creds || [];
  if (safeCreds.length === 0) {
    return {
      score: 100,
      grade: "A+",
      warnings: [],
      tips: [],
      stats: { total: 0, productionCount: 0, weakCount: 0, dummyCount: 0, missingUrlCount: 0 }
    };
  }

  let score = 100;
  const warnings = [];
  const tips = [];

  const dummyKeywords = ["test", "demo", "example", "sample", "changeme", "password", "1234", "admin", "default"];
  let productionCount = 0;
  let weakCount = 0;
  let missingUrlCount = 0;
  let dummyCount = 0;

  for (const c of safeCreds) {
    const val = (c.password || "").toLowerCase();
    const user = (c.username || "").toLowerCase();
    const env = c.environment || "global";

    if (env === "prod") productionCount++;

    if (dummyKeywords.some((d) => val === d || val.startsWith("your_") || user.startsWith("your_") || val.includes("dummy"))) {
      dummyCount++;
    }
    if ((c.password || "").length < 12) weakCount++;
    if (!c.url) missingUrlCount++;
  }

  if (dummyCount > 0) {
    score -= 25;
    warnings.push(`${dummyCount} credential(s) appear to be dummy/placeholder values`);
  }
  if (weakCount > 0) {
    score -= 15;
    warnings.push(`${weakCount} credential(s) have passwords shorter than 12 characters`);
  }
  if (missingUrlCount > 0 && safeCreds.length > 2) {
    score -= 5;
    tips.push(`${missingUrlCount} credential(s) have no URL — adding URLs helps identify portals quickly`);
  }
  if (productionCount > 0 && dummyCount > 0) {
    score -= 10;
    warnings.push("Production credentials include dummy values — high risk");
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";

  return {
    score,
    grade,
    warnings,
    tips,
    stats: {
      total: safeCreds.length,
      productionCount,
      weakCount,
      dummyCount,
      missingUrlCount,
    }
  };
}
