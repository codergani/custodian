import React from "react";
import { ShieldCheck } from "lucide-react";
import { S, COLORS } from "../styles";

export default function WelcomeScreen({ onSelect }) {
  function handleAction(mode) {
    try {
      localStorage.setItem("custodian_has_seen_welcome", "true");
    } catch (e) {
      console.warn("[WelcomeScreen] Could not store hasSeenWelcome preference:", e);
    }
    if (onSelect) {
      onSelect(mode);
    }
  }

  return (
    <div style={S.centerScreen}>
      <div style={{ ...S.authCard, textAlign: "center", alignItems: "center", maxWidth: 360, padding: "36px 28px" }}>
        {/* Centered Logo / App Icon */}
        <div
          style={{
            ...S.dialRing,
            width: 68,
            height: 68,
            margin: "0 auto 16px",
            borderRadius: "50%",
            border: `1.5px solid ${COLORS.brassDim}`,
            background: "rgba(148, 110, 55, 0.12)",
          }}
        >
          <ShieldCheck size={36} color={COLORS.brass} />
        </div>

        <div style={{ ...S.eyebrow, fontSize: 11, letterSpacing: "0.14em", marginBottom: 6 }}>
          CUSTODIAN
        </div>

        {/* Tagline */}
        <p
          style={{
            ...S.authSub,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.5,
            margin: "4px 0 32px",
            color: COLORS.text,
            maxWidth: 280,
          }}
        >
          Your secrets, your keys. Not even we can see them.
        </p>

        {/* Stacked Action Buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            style={{
              ...S.primaryBtn,
              width: "100%",
              margin: 0,
              padding: "12px 16px",
              fontSize: 14,
              letterSpacing: "0.02em",
            }}
            onClick={() => handleAction("signup")}
          >
            Create Account
          </button>

          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.textDim,
              fontSize: 13.5,
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              cursor: "pointer",
              padding: "10px 14px",
              borderRadius: 8,
              transition: "color 0.15s ease",
            }}
            onClick={() => handleAction("login")}
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
