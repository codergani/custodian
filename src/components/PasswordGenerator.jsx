import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  KeyRound, Copy, Check, RefreshCw, ShieldCheck, Dices, Eye, EyeOff,
  Hash, Lock, Fingerprint, Type, AlertTriangle, Zap, X, ChevronDown
} from "lucide-react";
import { S, COLORS } from "../styles";
import { generateSecret, calculateEntropy } from "../utils/passwordGenerator";
import { CustomDropdown, ToggleSwitch } from "./shared";

const MODES = [
  { id: "password", label: "🔑 Password", icon: <KeyRound size={13} /> },
  { id: "apikey", label: "🔐 API Key", icon: <Lock size={13} /> },
  { id: "hex", label: "🧊 Hex Token", icon: <Hash size={13} /> },
  { id: "base64", label: "📦 Base64", icon: <Fingerprint size={13} /> },
  { id: "uuid", label: "🆔 UUID v4", icon: <Dices size={13} /> },
  { id: "passphrase", label: "📝 Passphrase", icon: <Type size={13} /> },
];

const API_KEY_PREFIXES = [
  { value: "", label: "No prefix" },
  { value: "sk_live_", label: "sk_live_" },
  { value: "sk_test_", label: "sk_test_" },
  { value: "pk_live_", label: "pk_live_" },
  { value: "pk_test_", label: "pk_test_" },
  { value: "api_", label: "api_" },
  { value: "key_", label: "key_" },
  { value: "token_", label: "token_" },
];

const PASSPHRASE_SEPARATORS = [
  { value: "-", label: "Hyphen (-)" },
  { value: "_", label: "Underscore (_)" },
  { value: ".", label: "Period (.)" },
  { value: " ", label: "Space ( )" },
];

/**
 * Full Password / Secret Generator view (standalone page and compact inline).
 * @param {object} props
 * @param {boolean} props.compact - If true, renders as a compact inline popover
 * @param {function} props.onUseValue - Callback when user clicks "Use This" (compact mode)
 * @param {function} props.onClose - Callback to close (compact mode)
 */
export default function PasswordGenerator({ compact = false, onUseValue, onClose }) {
  // ─── State ───────────────────────────────────────────────────
  const [mode, setMode] = useState("password");
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [showValue, setShowValue] = useState(true);
  const [history, setHistory] = useState([]); // Last 5 generated values (volatile)

  // Password options
  const [pwLength, setPwLength] = useState(24);
  const [pwUppercase, setPwUppercase] = useState(true);
  const [pwLowercase, setPwLowercase] = useState(true);
  const [pwDigits, setPwDigits] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [pwExcludeAmbiguous, setPwExcludeAmbiguous] = useState(false);

  // API Key options
  const [akLength, setAkLength] = useState(48);
  const [akFormat, setAkFormat] = useState("hex");
  const [akPrefix, setAkPrefix] = useState("");

  // Hex / Base64 options
  const [hexLength, setHexLength] = useState(64);
  const [b64Length, setB64Length] = useState(44);

  // Passphrase options
  const [ppWordCount, setPpWordCount] = useState(5);
  const [ppSeparator, setPpSeparator] = useState("-");
  const [ppCapitalize, setPpCapitalize] = useState(false);

  const outputRef = useRef(null);

  // ─── Options based on current mode ────────────────────────────
  const getCurrentOptions = useCallback(() => {
    switch (mode) {
      case "password":
        return { length: pwLength, uppercase: pwUppercase, lowercase: pwLowercase, digits: pwDigits, symbols: pwSymbols, excludeAmbiguous: pwExcludeAmbiguous };
      case "apikey":
        return { length: akLength, format: akFormat, prefix: akPrefix };
      case "hex":
        return { length: hexLength };
      case "base64":
        return { length: b64Length };
      case "uuid":
        return {};
      case "passphrase":
        return { wordCount: ppWordCount, separator: ppSeparator, capitalize: ppCapitalize };
      default:
        return {};
    }
  }, [mode, pwLength, pwUppercase, pwLowercase, pwDigits, pwSymbols, pwExcludeAmbiguous, akLength, akFormat, akPrefix, hexLength, b64Length, ppWordCount, ppSeparator, ppCapitalize]);

  // ─── Generate ─────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const opts = getCurrentOptions();
    const value = generateSecret(mode, opts);
    setGenerated(value);
    setCopied(false);
    setShowValue(true);
    // Add to history (max 5, volatile — never persisted)
    setHistory((prev) => {
      const next = [{ value, mode, timestamp: Date.now() }, ...prev];
      return next.slice(0, 5);
    });
  }, [mode, getCurrentOptions]);

  // Auto-generate on mount and mode change
  useEffect(() => {
    handleGenerate();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Copy to clipboard ────────────────────────────────────────
  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text || generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text || generated;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generated]);

  // ─── Entropy ──────────────────────────────────────────────────
  const entropy = calculateEntropy(mode, getCurrentOptions());

  // ─── Styles ───────────────────────────────────────────────────
  const containerStyle = compact ? {
    display: "flex", flexDirection: "column", gap: 12,
  } : {
    maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16,
  };

  const sectionCard = {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 10,
    padding: compact ? "10px 12px" : "14px 16px",
  };

  return (
    <div style={containerStyle}>
      {/* Header (standalone mode only) */}
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(176,141,87,0.2), rgba(176,141,87,0.05))",
              border: `1.5px solid ${COLORS.brassDim}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Dices size={20} color={COLORS.brass} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
                Secure Generator
              </h2>
              <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 1 }}>
                Cryptographically secure • Client-side only • Never stored
              </div>
            </div>
          </div>
          <div style={{
            ...S.formSecurityNotice,
            margin: 0, padding: "6px 10px", fontSize: 11, borderRadius: 8,
            display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          }}>
            <ShieldCheck size={13} color={COLORS.green} />
            <span>crypto.getRandomValues()</span>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            style={{
              ...S.secondaryBtn,
              padding: compact ? "4px 8px" : "5px 10px",
              fontSize: compact ? 11 : 11.5,
              borderRadius: 7,
              background: mode === m.id ? "rgba(176,141,87,0.18)" : "transparent",
              borderColor: mode === m.id ? COLORS.brass : COLORS.line,
              color: mode === m.id ? COLORS.brass : COLORS.textDim,
              fontWeight: mode === m.id ? 600 : 400,
              display: "flex", alignItems: "center", gap: 4,
            }}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Generated Output */}
      <div style={sectionCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Generated {MODES.find((m) => m.id === mode)?.label.replace(/^[^\s]+\s/, "") || "Secret"}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={() => setShowValue(!showValue)}
              style={{ ...S.secondaryBtn, padding: "3px 6px", fontSize: 10, borderRadius: 5, display: "flex", alignItems: "center", gap: 3 }}
              title={showValue ? "Hide value" : "Show value"}
            >
              {showValue ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              style={{ ...S.secondaryBtn, padding: "3px 6px", fontSize: 10, borderRadius: 5, display: "flex", alignItems: "center", gap: 3, color: COLORS.brass, borderColor: COLORS.brassDim }}
              title="Regenerate"
            >
              <RefreshCw size={11} /> New
            </button>
          </div>
        </div>

        <div
          ref={outputRef}
          onClick={() => handleCopy()}
          style={{
            background: COLORS.panel,
            border: `1.5px solid ${copied ? COLORS.green : COLORS.brassDim}`,
            borderRadius: 8,
            padding: compact ? "10px 12px" : "12px 14px",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: mode === "passphrase" ? 14 : (compact ? 12 : 13.5),
            lineHeight: 1.6,
            wordBreak: "break-all",
            color: showValue ? COLORS.text : "transparent",
            textShadow: showValue ? "none" : `0 0 8px ${COLORS.textDim}`,
            cursor: "pointer",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: copied ? `0 0 0 2px ${COLORS.green}33` : "none",
            position: "relative",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            userSelect: showValue ? "all" : "none",
          }}
          title="Click to copy"
        >
          {generated || "Generating..."}
          <div style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center", gap: 4,
            background: COLORS.panel, padding: "2px 6px", borderRadius: 5,
            border: `1px solid ${COLORS.line}`,
          }}>
            {copied ? (
              <><Check size={13} color={COLORS.green} /><span style={{ fontSize: 10, color: COLORS.green }}>Copied!</span></>
            ) : (
              <><Copy size={12} color={COLORS.textDim} /><span style={{ fontSize: 10, color: COLORS.textDim }}>Copy</span></>
            )}
          </div>
        </div>

        {/* Strength Meter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{
            flex: 1, height: 4, borderRadius: 4,
            background: COLORS.line, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 4,
              width: `${Math.min(100, (entropy.bits / 128) * 100)}%`,
              background: entropy.color,
              transition: "width 0.3s ease, background 0.3s ease",
            }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: entropy.color, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
            <ShieldCheck size={12} />
            {entropy.label} ({entropy.bits} bits)
          </div>
        </div>
      </div>

      {/* Mode-specific Options */}
      <div style={sectionCard}>
        <div style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
          Options
        </div>

        {mode === "password" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Length Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: COLORS.textDim, width: 55, flexShrink: 0 }}>Length</label>
              <input
                type="range"
                min={8} max={128} value={pwLength}
                onChange={(e) => setPwLength(Number(e.target.value))}
                style={{ flex: 1, accentColor: COLORS.brass }}
              />
              <input
                type="number"
                min={8} max={128}
                value={pwLength}
                onChange={(e) => setPwLength(Math.max(8, Math.min(128, Number(e.target.value) || 8)))}
                style={{ ...S.input, width: 54, padding: "4px 6px", fontSize: 12, textAlign: "center", fontFamily: "IBM Plex Mono, monospace" }}
              />
            </div>

            {/* Character Toggles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Uppercase (A-Z)", checked: pwUppercase, set: setPwUppercase },
                { label: "Lowercase (a-z)", checked: pwLowercase, set: setPwLowercase },
                { label: "Digits (0-9)", checked: pwDigits, set: setPwDigits },
                { label: "Symbols (!@#$)", checked: pwSymbols, set: setPwSymbols },
              ].map((opt) => (
                <div key={opt.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: `1px solid ${COLORS.line}` }}>
                  <span style={{ fontSize: 11.5, color: COLORS.text }}>{opt.label}</span>
                  <ToggleSwitch checked={opt.checked} onChange={opt.set} />
                </div>
              ))}
            </div>

            {/* Exclude Ambiguous */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: `1px solid ${COLORS.line}` }}>
              <div>
                <span style={{ fontSize: 11.5, color: COLORS.text }}>Exclude Ambiguous</span>
                <div style={{ fontSize: 10, color: COLORS.textFaint }}>Removes 0, O, o, 1, l, I</div>
              </div>
              <ToggleSwitch checked={pwExcludeAmbiguous} onChange={setPwExcludeAmbiguous} />
            </div>
          </div>
        )}

        {mode === "apikey" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: COLORS.textDim, width: 55, flexShrink: 0 }}>Length</label>
              <input
                type="range"
                min={16} max={128} value={akLength}
                onChange={(e) => setAkLength(Number(e.target.value))}
                style={{ flex: 1, accentColor: COLORS.brass }}
              />
              <input
                type="number"
                min={16} max={128}
                value={akLength}
                onChange={(e) => setAkLength(Math.max(16, Math.min(128, Number(e.target.value) || 16)))}
                style={{ ...S.input, width: 54, padding: "4px 6px", fontSize: 12, textAlign: "center", fontFamily: "IBM Plex Mono, monospace" }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...S.label, fontSize: 11, marginBottom: 3 }}>Encoding</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["hex", "base64"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      style={{
                        ...S.secondaryBtn, flex: 1, padding: "5px 8px", fontSize: 11.5, borderRadius: 6, justifyContent: "center",
                        background: akFormat === f ? "rgba(176,141,87,0.15)" : "transparent",
                        borderColor: akFormat === f ? COLORS.brass : COLORS.line,
                        color: akFormat === f ? COLORS.brass : COLORS.textDim,
                      }}
                      onClick={() => setAkFormat(f)}
                    >
                      {f === "hex" ? "🧊 Hex" : "📦 Base64"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...S.label, fontSize: 11, marginBottom: 3 }}>Prefix</label>
                <CustomDropdown
                  value={akPrefix}
                  onChange={setAkPrefix}
                  options={API_KEY_PREFIXES}
                  buttonStyle={{ padding: "5px 8px", fontSize: 11.5 }}
                />
              </div>
            </div>
          </div>
        )}

        {mode === "hex" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 12, color: COLORS.textDim, width: 55, flexShrink: 0 }}>Length</label>
            <input
              type="range"
              min={8} max={256} value={hexLength}
              onChange={(e) => setHexLength(Number(e.target.value))}
              style={{ flex: 1, accentColor: COLORS.brass }}
            />
            <input
              type="number"
              min={8} max={256}
              value={hexLength}
              onChange={(e) => setHexLength(Math.max(8, Math.min(256, Number(e.target.value) || 8)))}
              style={{ ...S.input, width: 54, padding: "4px 6px", fontSize: 12, textAlign: "center", fontFamily: "IBM Plex Mono, monospace" }}
            />
          </div>
        )}

        {mode === "base64" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 12, color: COLORS.textDim, width: 55, flexShrink: 0 }}>Length</label>
            <input
              type="range"
              min={8} max={256} value={b64Length}
              onChange={(e) => setB64Length(Number(e.target.value))}
              style={{ flex: 1, accentColor: COLORS.brass }}
            />
            <input
              type="number"
              min={8} max={256}
              value={b64Length}
              onChange={(e) => setB64Length(Math.max(8, Math.min(256, Number(e.target.value) || 8)))}
              style={{ ...S.input, width: 54, padding: "4px 6px", fontSize: 12, textAlign: "center", fontFamily: "IBM Plex Mono, monospace" }}
            />
          </div>
        )}

        {mode === "uuid" && (
          <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
            <ShieldCheck size={13} color={COLORS.green} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            UUID v4 generates 122 bits of cryptographic randomness. No options needed — click <strong>New</strong> to regenerate.
          </div>
        )}

        {mode === "passphrase" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: COLORS.textDim, width: 55, flexShrink: 0 }}>Words</label>
              <input
                type="range"
                min={3} max={10} value={ppWordCount}
                onChange={(e) => setPpWordCount(Number(e.target.value))}
                style={{ flex: 1, accentColor: COLORS.brass }}
              />
              <input
                type="number"
                min={3} max={10}
                value={ppWordCount}
                onChange={(e) => setPpWordCount(Math.max(3, Math.min(10, Number(e.target.value) || 3)))}
                style={{ ...S.input, width: 54, padding: "4px 6px", fontSize: 12, textAlign: "center", fontFamily: "IBM Plex Mono, monospace" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...S.label, fontSize: 11, marginBottom: 3 }}>Separator</label>
                <CustomDropdown
                  value={ppSeparator}
                  onChange={setPpSeparator}
                  options={PASSPHRASE_SEPARATORS}
                  buttonStyle={{ padding: "5px 8px", fontSize: 11.5 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: `1px solid ${COLORS.line}`, flex: 1 }}>
                <span style={{ fontSize: 11.5, color: COLORS.text }}>Capitalize Words</span>
                <ToggleSwitch checked={ppCapitalize} onChange={setPpCapitalize} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Use This button (compact mode) */}
      {compact && onUseValue && (
        <button
          type="button"
          style={{ ...S.primaryBtn, justifyContent: "center", padding: "9px 16px" }}
          onClick={() => onUseValue(generated)}
        >
          <Zap size={14} /> Use This Value
        </button>
      )}

      {/* History (standalone mode only, volatile) */}
      {!compact && history.length > 1 && (
        <div style={sectionCard}>
          <div style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
            Recent (Session Only — Purged on Lock)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {history.slice(1).map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${COLORS.line}`,
                  cursor: "pointer",
                }}
                onClick={() => handleCopy(h.value)}
                title="Click to copy"
              >
                <span style={{ fontSize: 10, color: COLORS.textFaint, width: 60, flexShrink: 0 }}>
                  {MODES.find((m) => m.id === h.mode)?.label.replace(/^[^\s]+\s/, "") || h.mode}
                </span>
                <span style={{
                  flex: 1, fontSize: 11, fontFamily: "IBM Plex Mono, monospace",
                  color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {h.value}
                </span>
                <Copy size={11} color={COLORS.textFaint} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
