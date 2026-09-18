import React, { useState } from "react";
import { ShieldCheck, ChevronRight, Check, X, Sparkles, KeyRound, Folder, Package, BookOpen, Calendar } from "lucide-react";
import { S, COLORS } from "../styles";

const TOUR_STEPS = [
  {
    title: "Your Encrypted Vault",
    category: "1. PRIVATE BY DESIGN",
    icon: ShieldCheck,
    desc: "This is your vault — every client's credentials, API tokens, and database passwords encrypted locally with AES-256-GCM so only you hold the keys. Custodian servers never receive or store raw secrets.",
  },
  {
    title: "Client & Project Workspaces",
    category: "2. ISOLATED WORKSPACES",
    icon: Folder,
    desc: "Every client gets their own dedicated workspace — projects, environment-scoped credentials (Dev, Staging, Prod), and delivery tracking live here in complete isolation.",
  },
  {
    title: "Delivery Safety Buffers",
    category: "3. DEADLINE PROTECTION",
    icon: Calendar,
    desc: "Set a Delivery Safety Buffer for each project. By scheduling your target finish goal ahead of the client's contract deadline, Custodian warns you before you cut it close, leaving dedicated buffer days for QA.",
  },
  {
    title: "Starter SOPs & Resource Library",
    category: "4. REUSABLE ASSETS",
    icon: BookOpen,
    desc: "Your Resource Library already comes pre-loaded with freelancer starter templates — client onboarding checklists, project handover outlines, communication guidelines, and kickoff workflows. Use them, edit them, or add your own.",
  },
  {
    title: "API Renewal Watchdog",
    category: "5. COST & BILLING CONTROL",
    icon: Package,
    desc: "Renewal Watchdog keeps an eye on third-party subscriptions and API costs with automated countdowns, alerting you 1 day before recurring charges occur so nothing renews without you knowing.",
  },
];

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }

  function handleFinish() {
    try {
      localStorage.setItem("custodian_tour_completed", "true");
    } catch {}
    onComplete();
  }

  const current = TOUR_STEPS[step];
  const Icon = current.icon;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "var(--modal-overlay-bg, rgba(28, 24, 18, 0.48))",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div
        style={{
          ...S.modalCard,
          maxWidth: 480,
          padding: "26px 28px",
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          boxShadow: "var(--card-shadow, 0 20px 50px rgba(0,0,0,0.25))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 10.5, fontFamily: "IBM Plex Mono, monospace", color: COLORS.brass, letterSpacing: "0.06em", fontWeight: 600 }}>
            {current.category} ({step + 1}/{TOUR_STEPS.length})
          </span>
          <button
            style={S.iconBtnGhost}
            onClick={handleFinish}
            title="Skip tour"
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ ...S.dialRing, width: 44, height: 44, background: "rgba(148,110,55,0.12)", borderColor: COLORS.brass }}>
            <Icon size={22} color={COLORS.brass} />
          </div>
          <div>
            <h3 style={{ ...S.mainTitle, fontSize: 17, margin: 0 }}>{current.title}</h3>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: COLORS.textDim, lineHeight: 1.6, marginBottom: 20 }}>
          {current.desc}
        </p>

        {/* Step dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${COLORS.line}`, paddingTop: 14 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? COLORS.brass : "var(--line-main, #E2DDD5)",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...S.secondaryBtn, padding: "7px 12px", fontSize: 12 }}
              onClick={handleFinish}
            >
              Skip
            </button>
            <button
              style={{ ...S.primaryBtnSm, padding: "7px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={handleNext}
            >
              {step === TOUR_STEPS.length - 1 ? (
                <>Finish <Check size={13} /></>
              ) : (
                <>Next <ChevronRight size={13} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
