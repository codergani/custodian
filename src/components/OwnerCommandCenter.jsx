import React from "react";
import {
  ShieldCheck, Plus, Sparkles, Folder, Calendar,
  ChevronRight, AlertCircle, ArrowUpRight
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

  // Calculate project deadlines and delivery safety buffers
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Sleek Minimalist Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        paddingBottom: 4,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}>
              Vault Overview
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.green,
              background: "rgba(45, 106, 66, 0.12)",
              padding: "2px 8px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>
              <ShieldCheck size={11} /> Zero-Knowledge
            </span>
          </div>
          <p style={{
            fontSize: 13,
            color: COLORS.textDim,
            margin: "4px 0 0",
            fontWeight: 400,
          }}>
            {allProjects.length} {allProjects.length === 1 ? "project" : "projects"} across {clients.length} {clients.length === 1 ? "client" : "clients"} · {allActiveCreds.length} encrypted secrets
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            style={{
              ...S.secondaryBtn,
              fontSize: 12.5,
              padding: "7px 12px",
              borderRadius: 8,
            }}
            onClick={onAddClient}
          >
            <Plus size={13} />
            <span>New Client</span>
          </button>
          {onAddSecret && (
            <button
              type="button"
              style={{
                ...S.primaryBtnSm,
                fontSize: 12.5,
                padding: "7px 14px",
                borderRadius: 8,
              }}
              onClick={onAddSecret}
            >
              <Plus size={13} />
              <span>New Secret</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Urgent Attention Strip (Only shown when there's an actual urgent item) */}
      {(urgentProjects.length > 0 || urgentCreds.length > 0) && (
        <div style={{
          background: "rgba(181, 56, 43, 0.08)",
          border: "1px solid rgba(181, 56, 43, 0.25)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} color={COLORS.red} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.red }}>
              Action Needed:
            </span>
            <span style={{ fontSize: 12.5, color: COLORS.text }}>
              {urgentProjects.length > 0
                ? `Project deadline "${urgentProjects[0].name}" due in under 24 hours.`
                : `API key renewal "${urgentCreds[0]?.label}" due tomorrow.`}
            </span>
          </div>
          {urgentProjects.length > 0 ? (
            <button
              type="button"
              style={{ ...S.secondaryBtn, fontSize: 11.5, padding: "3px 9px", color: COLORS.red, borderColor: "rgba(181, 56, 43, 0.3)" }}
              onClick={() => onSelectProject(urgentProjects[0].clientId, urgentProjects[0].id, "timeline")}
            >
              Open Project <ChevronRight size={12} />
            </button>
          ) : (
            <button
              type="button"
              style={{ ...S.secondaryBtn, fontSize: 11.5, padding: "3px 9px", color: COLORS.red, borderColor: "rgba(181, 56, 43, 0.3)" }}
              onClick={onOpenWatchdog}
            >
              Open Watchdog <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* 3. Minimalist Key Metrics Strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10,
      }}>
        <div style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint, fontWeight: 500 }}>Projects & Workspaces</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>
            {allProjects.length}
            <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim, marginLeft: 6 }}>
              in {clients.length} {clients.length === 1 ? "client" : "clients"}
            </span>
          </div>
        </div>

        <div style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint, fontWeight: 500 }}>Encrypted Secrets</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>
            {allActiveCreds.length}
            <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim, marginLeft: 6 }}>
              AES-256-GCM
            </span>
          </div>
        </div>

        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "12px 14px",
            cursor: "pointer",
            transition: "border-color 0.15s ease",
          }}
          onClick={onOpenWatchdog}
          title="Open Subscription Watchdog"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11.5, color: COLORS.textFaint, fontWeight: 500 }}>Monthly API Spend</span>
            <ArrowUpRight size={12} color={COLORS.textFaint} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>
            {formattedMonthlySpend}
            <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim, marginLeft: 6 }}>
              {activeTrackedCreds.length} tracked
            </span>
          </div>
        </div>

        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "12px 14px",
            cursor: "pointer",
            transition: "border-color 0.15s ease",
          }}
          onClick={onOpenWatchdog}
          title="Open Subscription Watchdog"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11.5, color: COLORS.green, fontWeight: 500 }}>Saved via Watchdog</span>
            <ArrowUpRight size={12} color={COLORS.green} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.green, marginTop: 4 }}>
            {formattedMonthlySavings}
            <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim, marginLeft: 6 }}>
              / month
            </span>
          </div>
        </div>
      </div>

      {/* 4. Projects Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
            Projects
          </span>
          <span style={{ fontSize: 11.5, color: COLORS.textFaint }}>
            Click a project to open credentials
          </span>
        </div>

        {allProjects.length === 0 ? (
          <div style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            padding: "36px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(176, 141, 87, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Folder size={20} color={COLORS.brass} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                No Client Projects Yet
              </div>
              <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: "4px 0 0", maxWidth: 380 }}>
                Create your first client workspace to start organizing and encrypting your credentials.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {onStartTour && (
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: 12 }}
                  onClick={onStartTour}
                >
                  <Sparkles size={12} color={COLORS.brass} /> Quick Tour
                </button>
              )}
              <button
                type="button"
                style={{ ...S.primaryBtnSm, fontSize: 12 }}
                onClick={onAddClient}
              >
                <Plus size={13} /> Create Client
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {projectsWithDeadlines.map((p) => {
              const secCount = p.credentials?.length || 0;
              const hasDue = p.daysToLD !== null;
              const isUrgent = p.daysToLD !== null && p.daysToLD <= 2;

              return (
                <div
                  key={p.id}
                  style={{
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    transition: "border-color 0.15s ease, transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.brassDim;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.line;
                  }}
                  onClick={() => onSelectProject(p.clientId, p.id, "creds")}
                >
                  {/* Top: Client + Secrets count */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {p.clientName}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textDim,
                      background: COLORS.panelAlt,
                      padding: "2px 7px",
                      borderRadius: 12,
                    }}>
                      {secCount} {secCount === 1 ? "secret" : "secrets"}
                    </span>
                  </div>

                  {/* Title */}
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.text,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}>
                    {p.name}
                  </div>

                  {/* Status / Deadline pills */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                    {hasDue ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: isUrgent ? COLORS.red : COLORS.textDim,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}>
                        <Calendar size={11} color={isUrgent ? COLORS.red : COLORS.textFaint} />
                        Due in {p.daysToLD}d
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: COLORS.textFaint }}>
                        No deadline
                      </span>
                    )}

                    {p.greyDays !== null && p.greyDays >= 0 && (
                      <span style={{
                        fontSize: 10.5,
                        color: COLORS.brass,
                        background: "rgba(176, 141, 87, 0.08)",
                        padding: "1px 6px",
                        borderRadius: 4,
                        marginLeft: "auto",
                      }}>
                        {p.greyDays}d buffer
                      </span>
                    )}
                  </div>

                  {/* Checklist bar if tasks exist */}
                  {p.checklistCount > 0 && (
                    <div style={{ width: "100%", height: 3, background: COLORS.line, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${p.progressPercent}%`,
                        background: p.progressPercent === 100 ? COLORS.green : COLORS.brass,
                        borderRadius: 2,
                      }} />
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
