import React from "react";
import {
  Crown, ShieldCheck, Plus, Zap, Hourglass, ChevronRight, BellRing,
  Folder, Calendar, KeyRound, CheckSquare, Pin, ArrowRight, Sparkles
} from "lucide-react";
import { S, COLORS } from "../styles";

export default function OwnerCommandCenter({
  clients = [],
  profile,
  allActiveCreds = [],
  activeTrackedCreds = [],
  canceledCreds = [],
  urgentCreds = [],
  formattedMonthlySpend,
  formattedMonthlySavings,
  formattedAnnualSavings,
  defaultCurrency,
  onSelectProject,
  onAddClient,
  onAddProject,
  onAddSecret,
  onOpenUpgrade,
  onOpenWatchdog,
  onStartTour,
}) {
  // Aggregate all projects across clients
  const allProjects = (clients || []).flatMap((c) =>
    (c?.projects || []).map((p) => ({
      ...p,
      clientId: c?.id,
      clientName: c?.name || "Client",
    }))
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Calculate project deadlines and Grey Days for each project
  const projectsWithDeadlines = allProjects.map((p) => {
    const details = p.details || {};
    const lastDate = details.lastDate || "";
    const lastPartialDate = details.lastPartialDate || "";
    const checklist = details.checklist || [];
    const completedTasks = checklist.filter((t) => t.completed).length;

    let daysToLD = null;
    let daysToLPD = null;
    let greyDays = null;

    if (lastDate) {
      const d = new Date(lastDate);
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        daysToLD = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    if (lastPartialDate) {
      const d = new Date(lastPartialDate);
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        daysToLPD = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    if (lastDate && lastPartialDate) {
      const ldTime = new Date(lastDate).getTime();
      const lpdTime = new Date(lastPartialDate).getTime();
      if (!isNaN(ldTime) && !isNaN(lpdTime)) {
        greyDays = Math.round((ldTime - lpdTime) / (1000 * 60 * 60 * 24));
      }
    }

    const isUrgent24h =
      (daysToLPD !== null && daysToLPD >= 0 && daysToLPD <= 1) ||
      (daysToLD !== null && daysToLD >= 0 && daysToLD <= 1);

    return {
      ...p,
      daysToLD,
      daysToLPD,
      greyDays,
      isUrgent24h,
      checklistCount: checklist.length,
      completedTasks,
      progressPercent: checklist.length ? Math.round((completedTasks / checklist.length) * 100) : 0,
    };
  });

  const urgentProjects = projectsWithDeadlines.filter((p) => p.isUrgent24h);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Executive Owner Banner */}
      <div style={S.ownerHeaderCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...S.dialRing, width: 44, height: 44, background: "var(--highlight-bg, rgba(148,110,55,0.12))", borderColor: COLORS.brass }}>
            <Crown size={22} color={COLORS.brass} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
                Vault Overview & Deadlines
              </span>
              <span style={{ ...S.rolePillOwner, fontSize: 10 }}>WORKSPACE CONTROL</span>
              <span
                style={{ fontSize: 11, color: COLORS.green, display: "inline-flex", alignItems: "center", gap: 4, cursor: "help" }}
                title="Client-Side Zero-Knowledge Protection: All passwords, API keys, and environment variables are encrypted locally with AES-256-GCM before leaving your device. Even database administrators cannot read your secrets."
              >
                <ShieldCheck size={12} /> 🔒 AES-256 Protection Active ⓘ
              </span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 3 }}>
              Manage client workspaces, encrypted secrets, contract delivery buffers, and API renewal budgets.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {onAddSecret && (
            <button style={S.primaryBtn} onClick={onAddSecret}>
              <Plus size={13} /> + New Secret
            </button>
          )}
          <button style={S.secondaryBtn} onClick={onAddClient}>
            <Plus size={13} /> New Client
          </button>
          {profile?.plan === "free" && (
            <button style={S.primaryBtnSm} onClick={onOpenUpgrade}>
              <Zap size={13} /> Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Urgent 24-Hour Alerts (if any) */}
      {(urgentProjects.length > 0 || urgentCreds.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.red, display: "flex", alignItems: "center", gap: 6 }}>
            <Hourglass size={14} color={COLORS.red} /> Urgent 24-Hour Attention Required
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {urgentProjects.map((p) => (
              <div
                key={"urgent-p-" + p.id}
                style={{ ...S.watchdogCard, ...S.watchdogCardUrgent, cursor: "pointer" }}
                onClick={() => onSelectProject(p.clientId, p.id, "timeline")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Hourglass size={16} color={COLORS.red} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.red }}>
                      ⏳ Project deadline due in under 24 hours! Click to open.
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color={COLORS.textDim} />
              </div>
            ))}

            {urgentCreds.slice(0, 2).map((c) => (
              <div
                key={"urgent-c-" + c.id}
                style={{ ...S.watchdogCard, ...S.watchdogCardUrgent, cursor: "pointer" }}
                onClick={onOpenWatchdog}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <BellRing size={16} color={COLORS.red} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: COLORS.red }}>
                      🔴 API renewal due {c.renewalInfo?.nextDate}
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color={COLORS.textDim} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Executive KPI Cards */}
      <div style={S.watchdogStatGrid}>
        <div style={S.watchdogStatCard}>
          <div style={S.watchdogStatLabel}>Active Clients & Projects</div>
          <div style={S.watchdogStatValue}>
            {allProjects.length} <span style={{ fontSize: 13, color: COLORS.textDim, fontWeight: 400 }}>in {clients.length} client{clients.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>Tracked in your vault</div>
        </div>

        <div style={S.watchdogStatCard}>
          <div style={S.watchdogStatLabel}>Encrypted Secrets</div>
          <div style={{ ...S.watchdogStatValue, color: COLORS.brass }}>{allActiveCreds.length}</div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>Client-side AES-256 protected</div>
        </div>

        <div style={S.watchdogStatCard}>
          <div style={S.watchdogStatLabel}>Monthly API Spend</div>
          <div style={{ ...S.watchdogStatValue, color: COLORS.text, fontSize: 18 }}>{formattedMonthlySpend}</div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>
            {activeTrackedCreds.length === 0 ? "0 subscriptions tracked · Add cost to keys" : "Active ongoing subscriptions"}
          </div>
        </div>

        <div style={S.savingsStatCard}>
          <div style={{ ...S.watchdogStatLabel, color: COLORS.green }}>Total Money Saved</div>
          <div style={{ ...S.watchdogStatValue, color: COLORS.green, fontSize: 18 }}>{formattedMonthlySavings}/mo</div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>
            {canceledCreds.length === 0 ? "Cancel unused APIs in Watchdog" : `${formattedAnnualSavings} annualized savings`}
          </div>
        </div>
      </div>

      {/* All Projects & Delivery Buffers Matrix */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Folder size={15} color="#B08D57" />
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
              Project Workspaces ({allProjects.length})
            </span>
          </div>
          <span style={{ fontSize: 11, color: COLORS.brass, fontFamily: "IBM Plex Mono, monospace" }}>
            SELECT A PROJECT TO ENTER MULTI-TAB WORKSPACE
          </span>
        </div>

        {allProjects.length === 0 ? (
          <div style={S.quickStartCard}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ maxWidth: 540 }}>
                <div style={{ ...S.eyebrow, color: COLORS.brass }}>QUICK-START ONBOARDING</div>
                <h2 style={{ ...S.mainTitle, fontSize: 19, margin: "4px 0 8px" }}>
                  Welcome to Your Secure Client Vault
                </h2>
                <p style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.55, margin: 0 }}>
                  Custodian protects your client API keys, database secrets, and delivery timelines with zero-knowledge AES-256 encryption. Let's set up your first client workspace in 30 seconds.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {onStartTour && (
                  <button type="button" style={S.secondaryBtn} onClick={onStartTour}>
                    <Sparkles size={13} color={COLORS.brass} /> Take 1-Min Tour
                  </button>
                )}
                <button
                  type="button"
                  style={{ ...S.primaryBtnSm, padding: "9px 16px", fontSize: 13 }}
                  onClick={onAddClient}
                >
                  <Plus size={15} /> Create First Client
                </button>
              </div>
            </div>

            {/* 3-Step Visual Roadmap */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 4 }}>
              <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.brass, color: "var(--primary-btn-text, #FFFFFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>1</div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Add Client & Project</span>
                </div>
                <p style={{ fontSize: 11.5, color: COLORS.textFaint, lineHeight: 1.45, margin: 0 }}>
                  Group apps by client (e.g. Acme Corp &gt; Web App) to keep projects strictly isolated.
                </p>
              </div>

              <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.brass, color: "var(--primary-btn-text, #FFFFFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>2</div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Store Secrets & .env Keys</span>
                </div>
                <p style={{ fontSize: 11.5, color: COLORS.textFaint, lineHeight: 1.45, margin: 0 }}>
                  Store database passwords, Stripe keys, or import full .env files with client-side encryption.
                </p>
              </div>

              <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.brass, color: "var(--primary-btn-text, #FFFFFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>3</div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Set Delivery Safety Buffers</span>
                </div>
                <p style={{ fontSize: 11.5, color: COLORS.textFaint, lineHeight: 1.45, margin: 0 }}>
                  Set your internal goal ahead of the client contract deadline to protect against scope creep.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {projectsWithDeadlines.map((p) => {
              const details = p.details || {};
              const attachments = details.attachments || [];

              return (
                <div
                  key={p.id}
                  style={S.overviewProjectCard}
                  onClick={() => onSelectProject(p.clientId, p.id, "creds")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 11, color: COLORS.brass, fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>
                        {p.clientName.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>
                        {p.name}
                      </div>
                    </div>
                    <span style={S.rolePillMember}>
                      {p.credentials?.length || 0} secret{(p.credentials?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Deadlines & Delivery Buffer Pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.daysToLD !== null ? (
                      <span style={p.daysToLD <= 2 ? S.urgencyPillCritical : S.urgencyPillActive}>
                        <Calendar size={11} /> Due in {p.daysToLD}d
                      </span>
                    ) : (
                      <span style={{ ...S.urgencyPillActive, background: COLORS.panelAlt, color: COLORS.textDim, borderColor: COLORS.line }}>
                        No deadline set
                      </span>
                    )}

                    {p.greyDays !== null && p.greyDays >= 0 && (
                      <span
                        style={{ ...S.savingsBadge, cursor: "help" }}
                        title="Delivery Safety Buffer (Grey Days): The safety margin of days between your target completion goal and the client's contract delivery deadline to ensure on-time delivery."
                      >
                        <ShieldCheck size={11} /> {p.greyDays}d Delivery Buffer ⓘ
                      </span>
                    )}
                  </div>

                  {/* Checklist Progress */}
                  {p.checklistCount > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textFaint }}>
                        <span>Checklist: {p.completedTasks}/{p.checklistCount} done</span>
                        <span>{p.progressPercent}%</span>
                      </div>
                      <div style={S.progressBarBg}>
                        <div style={{ ...S.progressBarFill, width: `${p.progressPercent}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: COLORS.textFaint }}>
                      Checklist: 0 deliverables tracked
                    </div>
                  )}

                  {/* Quick-Jump Tabs Shortcuts */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 4, borderTop: `1px solid ${COLORS.line}` }}>
                    <button
                      type="button"
                      style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "3px 7px", borderRadius: 6 }}
                      onClick={(e) => { e.stopPropagation(); onSelectProject(p.clientId, p.id, "creds"); }}
                      title="Open Secrets & .env Tab"
                    >
                      <KeyRound size={10} color={COLORS.brass} /> {p.credentials?.length || 0} Secrets
                    </button>
                    <button
                      type="button"
                      style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "3px 7px", borderRadius: 6 }}
                      onClick={(e) => { e.stopPropagation(); onSelectProject(p.clientId, p.id, "timeline"); }}
                      title="Open Delivery Timeline Tab"
                    >
                      <Calendar size={10} color={COLORS.brass} /> Timeline
                    </button>
                    <button
                      type="button"
                      style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "3px 7px", borderRadius: 6 }}
                      onClick={(e) => { e.stopPropagation(); onSelectProject(p.clientId, p.id, "checklist"); }}
                      title="Open Deliverables Checklist Tab"
                    >
                      <CheckSquare size={10} color={COLORS.green} /> {p.completedTasks}/{p.checklistCount} Tasks
                    </button>
                    <button
                      type="button"
                      style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "3px 7px", borderRadius: 6 }}
                      onClick={(e) => { e.stopPropagation(); onSelectProject(p.clientId, p.id, "docs"); }}
                      title="Open Pinned PRDs & Docs Tab"
                    >
                      <Pin size={10} color={COLORS.brass} /> {attachments.length} Docs
                    </button>
                  </div>

                  {/* Primary Open Workspace CTA Bar */}
                  <div style={S.overviewOpenBtn}>
                    <span>Open Project Workspace (5 Tabs)</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
