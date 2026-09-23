import React from "react";
import { ShieldCheck, Lock, Share2, Clock, Check, ArrowRight } from "lucide-react";
import { COLORS } from "../styles";
import { VAULT_PLANS } from "../config/plans";

export default function LandingPage({ onLogin, onSignup }) {
  const features = [
    {
      icon: <Lock size={22} color={COLORS.brass} />,
      title: "Zero-Knowledge Encryption",
      desc: "Client-side AES-256-GCM encryption ensures your secrets and credentials never touch a server unencrypted.",
    },
    {
      icon: <Share2 size={22} color={COLORS.brass} />,
      title: "Secure Sharing",
      desc: "Stop pasting production passwords in WhatsApp or Slack; deliver client-ready, encrypted handover packages in 1 click.",
    },
    {
      icon: <Clock size={22} color={COLORS.brass} />,
      title: "Renewal Watchdog",
      desc: "Stay ahead of domain and API expiration deadlines with automated countdowns, advance warnings, and cost tracking.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Bar */}
      <header
        style={{
          borderBottom: `1px solid ${COLORS.line}`,
          backgroundColor: COLORS.panel,
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo Left */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `1px solid ${COLORS.brassDim}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(148, 110, 55, 0.1)",
              }}
            >
              <ShieldCheck size={18} color={COLORS.brass} />
            </div>
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.08em",
                color: COLORS.text,
              }}
            >
              CUSTODIAN
            </span>
          </div>

          {/* Right Links: Log In text link + Get Started button */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button
              type="button"
              onClick={onLogin}
              style={{
                background: "transparent",
                border: "none",
                color: COLORS.textDim,
                fontSize: 13.5,
                fontWeight: 500,
                cursor: "pointer",
                padding: "8px 12px",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={onSignup}
              style={{
                background: COLORS.brass,
                color: "var(--primary-btn-text, #FFFFFF)",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "72px 20px 56px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: COLORS.brass,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          Zero-Knowledge Client Secret Vault
        </div>
        <h1
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "clamp(28px, 5vw, 46px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: "0 0 18px",
            color: COLORS.text,
          }}
        >
          The Zero-Knowledge Secret Vault & Client Handover Platform
        </h1>
        <p
          style={{
            fontSize: "clamp(15px, 2.5vw, 17px)",
            color: COLORS.textDim,
            lineHeight: 1.6,
            maxWidth: 680,
            margin: "0 0 28px",
          }}
        >
          Client-side encrypted credential management, automated renewal alerts, and audited handover packages designed for developers, freelancers, and engineering teams.
        </p>
        <button
          type="button"
          onClick={onSignup}
          style={{
            background: COLORS.brass,
            color: "var(--primary-btn-text, #FFFFFF)",
            border: "none",
            borderRadius: 8,
            padding: "14px 28px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(148, 110, 55, 0.25)",
          }}
        >
          Get Started Free <ArrowRight size={16} />
        </button>
      </section>

      {/* Feature Section: Exactly 3 Cards */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "32px 20px 72px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {features.map((feat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: COLORS.panel,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 12,
                padding: "26px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "var(--card-shadow, 0 4px 20px rgba(0,0,0,0.04))",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: "rgba(148, 110, 55, 0.1)",
                  border: `1px solid ${COLORS.brassDim}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {feat.icon}
              </div>
              <h2
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  margin: 0,
                  color: COLORS.text,
                }}
              >
                {feat.title}
              </h2>
              <p
                style={{
                  fontSize: 13.5,
                  color: COLORS.textDim,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section: 3 Cards */}
      <section
        style={{
          backgroundColor: COLORS.panelAlt,
          borderTop: `1px solid ${COLORS.line}`,
          borderBottom: `1px solid ${COLORS.line}`,
          padding: "64px 20px 80px",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: COLORS.brass,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Transparent Pricing
            </div>
            <h2
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 28,
                fontWeight: 700,
                margin: "0 0 10px",
                color: COLORS.text,
              }}
            >
              Simple Plans for Every Stage
            </h2>
            <p style={{ fontSize: 14, color: COLORS.textDim, margin: 0 }}>
              Upgrade anytime to unlock team collaboration, advanced security audits, and client handovers.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "stretch",
            }}
          >
            {VAULT_PLANS.map((plan) => (
              <div
                key={plan.id}
                style={{
                  backgroundColor: COLORS.panel,
                  border: `1px solid ${plan.popular ? COLORS.brass : COLORS.line}`,
                  borderRadius: 12,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: plan.popular
                    ? "0 6px 24px rgba(148, 110, 55, 0.15)"
                    : "var(--card-shadow, 0 4px 20px rgba(0,0,0,0.04))",
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: 20,
                      backgroundColor: COLORS.brass,
                      color: "var(--primary-btn-text, #FFFFFF)",
                      fontSize: 10.5,
                      fontWeight: 700,
                      fontFamily: "IBM Plex Mono, monospace",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 10px",
                      borderRadius: 12,
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div>
                  <h3
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 18,
                      fontWeight: 600,
                      margin: "0 0 6px",
                      color: COLORS.text,
                    }}
                  >
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 32,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {plan.price}
                    </span>
                    <span style={{ fontSize: 13, color: COLORS.textDim }}>
                      {plan.period}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: COLORS.textDim,
                      lineHeight: 1.5,
                      margin: "0 0 20px",
                    }}
                  >
                    {plan.desc}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      borderTop: `1px solid ${COLORS.line}`,
                      paddingTop: 16,
                      marginBottom: 24,
                    }}
                  >
                    {plan.features.slice(0, 6).map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 12.5,
                          color: COLORS.text,
                        }}
                      >
                        <Check
                          size={14}
                          color={COLORS.brass}
                          style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <span style={{ lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignup}
                  style={{
                    width: "100%",
                    background: plan.popular ? COLORS.brass : "transparent",
                    color: plan.popular ? "var(--primary-btn-text, #FFFFFF)" : COLORS.text,
                    border: plan.popular ? "none" : `1px solid ${COLORS.line}`,
                    borderRadius: 8,
                    padding: "11px 16px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {plan.cta || "Get Started"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          backgroundColor: COLORS.panel,
          borderTop: `1px solid ${COLORS.line}`,
          padding: "32px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={18} color={COLORS.brass} />
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.06em",
              }}
            >
              CUSTODIAN
            </span>
            <span
              style={{
                fontSize: 12,
                color: COLORS.textFaint,
                marginLeft: 8,
              }}
            >
              © 2026 Custodian. All rights reserved.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <a
              href="/privacy.html"
              style={{
                fontSize: 12.5,
                color: COLORS.textDim,
                textDecoration: "none",
              }}
            >
              Privacy Policy
            </a>
            <span style={{ fontSize: 12.5, color: COLORS.textFaint }}>•</span>
            <span
              style={{
                fontSize: 12.5,
                color: COLORS.textDim,
                cursor: "pointer",
              }}
              onClick={onLogin}
            >
              Log In
            </span>
            <span style={{ fontSize: 12.5, color: COLORS.textFaint }}>•</span>
            <span
              style={{
                fontSize: 12.5,
                color: COLORS.textDim,
                cursor: "pointer",
              }}
              onClick={onSignup}
            >
              Sign Up
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
