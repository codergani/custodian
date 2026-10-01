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
      <div style={{ ...S.authCard, textAlign: "center", alignItems: "center", maxWidth: 390, padding: "40px 32px" }}>
        {/* Centered Logo / App Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 20px",
            borderRadius: 20,
            border: "1px solid rgba(0, 210, 255, 0.4)",
            background: "linear-gradient(135deg, rgba(0, 210, 255, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)",
            boxShadow: "0 0 32px rgba(0, 210, 255, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheck size={38} color={COLORS.cyan} />
        </div>

        <h1
          style={{
            fontFamily: "Outfit, sans-serif",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 6px",
            background: "linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CUSTODIAN
        </h1>

        <div style={{ ...S.eyebrow, fontSize: 10.5, letterSpacing: "0.18em", color: COLORS.cyan, marginBottom: 12 }}>
          AEGIS ZERO-KNOWLEDGE VAULT
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 400,
            lineHeight: 1.6,
            margin: "0 0 32px",
            color: COLORS.textDim,
            maxWidth: 320,
          }}
        >
          Your secrets, your keys. Not even we can see them.
        </p>

        {/* Stacked Action Buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            className="aegis-btn-primary"
            style={{
              ...S.primaryBtn,
              width: "100%",
              margin: 0,
              padding: "13px 20px",
              fontSize: 14,
              letterSpacing: "0.01em",
            }}
            onClick={() => handleAction("signup")}
          >
            Create Account
          </button>

          <button
            type="button"
            style={{
              ...S.secondaryBtn,
              width: "100%",
              justifyContent: "center",
              padding: "12px 20px",
              fontSize: 13.5,
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
