import React from "react";
import {
  Sparkles, Clock, PiggyBank, ExternalLink, ShieldCheck, Zap, Crown,
  CheckCircle2, BellRing, RefreshCw, Calendar, History, CheckCircle,
  RotateCcw, TrendingDown, Bell, KeyRound, Edit3
} from "lucide-react";
import { S, COLORS } from "../styles";

export default function WatchdogView({
  trackedCreds = [],
  urgentCreds = [],
  canceledCreds = [],
  planAdjustments = [],
  formattedMonthlySpend,
  formattedMonthlySavings,
  formattedAnnualSavings,
  onEditCred,
  onToggleCancel,
  onOpenUpgrade,
  currentPlan,
}) {
  if (currentPlan === "free") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 440, textAlign: "center", padding: "16px" }}>
        <div style={{ ...S.dialRing, width: 56, height: 56, marginBottom: 14 }}>
          <Sparkles size={28} color="#B08D57" />
        </div>
        <div style={{ ...S.eyebrow, color: COLORS.brass }}>PRO & TEAM EXCLUSIVE</div>
        <h2 style={{ ...S.mainTitle, fontSize: 24, marginBottom: 8 }}>Renewal Watchdog & Money Saved Tracker</h2>
        <p style={{ fontSize: 13.5, color: COLORS.textDim, maxWidth: 520, lineHeight: 1.6, marginBottom: 24 }}>
          Never get billed for forgotten API subscriptions on past client projects.
          Track active keys, get 1-day auto-debit alerts, and see exact total dollars saved by canceling unwanted keys.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 640, width: "100%", textAlign: "left", marginBottom: 26 }}>
          <div style={S.watchdogStatCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.brass, fontWeight: 600, fontSize: 13 }}>
              <Clock size={15} /> 1-Day Prior Alerts
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4 }}>
              Visual urgency badges (🔴 Renews Tomorrow) and automatic countdowns.
            </div>
          </div>
          <div style={S.watchdogStatCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8FA98C", fontWeight: 600, fontSize: 13 }}>
              <PiggyBank size={15} /> Total Money Saved Log
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4 }}>
              Calculates exact monthly & annual money saved by canceling unwanted keys.
            </div>
          </div>
          <div style={S.watchdogStatCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FFA296", fontWeight: 600, fontSize: 13 }}>
              <ExternalLink size={15} /> 1-Click Cancellation
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4 }}>
              Direct shortcuts to provider billing dashboards to cancel unwanted keys instantly.
            </div>
          </div>
          <div style={S.watchdogStatCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.brass, fontWeight: 600, fontSize: 13 }}>
              <ShieldCheck size={15} /> Zero-Knowledge Privacy
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4 }}>
              All billing dates, plans & costs are client-side AES-256 encrypted.
            </div>
          </div>
        </div>

        <button
          style={{ ...S.primaryBtn, padding: "12px 28px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 8, width: "auto" }}
          onClick={onOpenUpgrade}
        >
          <Zap size={16} /> Upgrade to Pro ($8/mo) to Unlock Watchdog
        </button>
      </div>
    );
  }

  const permanentCreds = trackedCreds.filter((c) => c.alertIntent === "permanent_auto");
  const upcomingSafeCreds = trackedCreds.filter(
    (c) => c.alertIntent !== "permanent_auto" && c.renewalInfo?.urgency === "active"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ ...S.mainHeadRow, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={S.eyebrow}>RENEWAL WATCHDOG</div>
          <h2 style={S.mainTitle}>API Billing & Savings Tracker</h2>
          <div style={{ fontSize: 12.5, color: COLORS.textDim, marginTop: 4 }}>
            Monitor API subscriptions, prevent unexpected auto-charges, and track cumulative money saved.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={currentPlan === "team" ? S.planBadgeTeam : S.planBadgePro}>
            {currentPlan.toUpperCase()} TIER
          </span>
        </div>
      </div>

      {/* 4 KPI Stats Cards */}
      <div style={S.watchdogStatGrid}>
        <div style={S.watchdogStatCard}>
          <div style={S.watchdogStatLabel}>Active Subscriptions</div>
          <div style={S.watchdogStatValue}>{trackedCreds.length}</div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>Tracked in your active vault</div>
        </div>

        <div style={S.watchdogStatCard}>
          <div style={S.watchdogStatLabel}>Estimated Monthly Spend</div>
          <div style={{ ...S.watchdogStatValue, color: COLORS.brass, fontSize: 18 }}>
            {formattedMonthlySpend}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>Active ongoing API expenses</div>
        </div>

        <div style={{ ...S.watchdogStatCard, ...(urgentCreds.length ? { borderColor: "rgba(224,122,109,0.3)" } : {}) }}>
          <div style={S.watchdogStatLabel}>Action Needed (Soon)</div>
          <div style={{ ...S.watchdogStatValue, color: urgentCreds.length ? "#E07A6D" : "#8FA98C" }}>
            {urgentCreds.length}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>
            {urgentCreds.length ? "In review/cancellation window" : "No urgent deadlines"}
          </div>
        </div>

        <div style={S.savingsStatCard}>
          <div style={{ ...S.watchdogStatLabel, color: "#8FA98C" }}>Total Money Saved</div>
          <div style={{ ...S.watchdogStatValue, color: "#8FA98C", fontSize: 18 }}>
            {formattedMonthlySavings}/mo
          </div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>
            {formattedAnnualSavings} saved!
          </div>
        </div>
      </div>

      {/* #1 Pinned Item: Custodian Platform Membership */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.brass, fontSize: 12.5, fontWeight: 600 }}>
          <Crown size={15} color="#B08D57" /> Platform & Security Infrastructure (Rank #1)
        </div>

        <div
          style={{
            ...S.watchdogCard,
            background: "linear-gradient(135deg, rgba(176,141,87,0.12) 0%, rgba(26,22,17,0.85) 100%)",
            border: `1.5px solid ${COLORS.brassDim}`,
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...S.dialRing, width: 40, height: 40, background: "rgba(176,141,87,0.2)", borderColor: COLORS.brass }}>
              <ShieldCheck size={20} color="#B08D57" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>
                  {currentPlan === "founder"
                    ? "👑 Custodian Founder Tier"
                    : currentPlan === "team"
                    ? "Custodian Team Membership"
                    : currentPlan === "pro"
                    ? "Custodian Pro Membership"
                    : "Custodian Free Tier"}
                </span>
                <span
                  style={
                    currentPlan === "founder"
                      ? S.planBadgeFounder
                      : currentPlan === "team"
                      ? S.planBadgeTeam
                      : currentPlan === "pro"
                      ? S.planBadgePro
                      : S.planBadge
                  }
                >
                  {currentPlan.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: "#8FA98C", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={11} /> {currentPlan === "founder" ? "Platform Creator VIP" : "Active Security Vault"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 3 }}>
                {currentPlan === "founder"
                  ? "Platform Founder • Lifetime unlimited clients, projects, team sharing & zero restrictions."
                  : currentPlan === "team"
                  ? "Team shared vaults, restricted roles, unlimited clients & Grey Days buffer protection."
                  : currentPlan === "pro"
                  ? "Unlimited clients & projects, 1-day advance renewal watchdog, and money saved tracker."
                  : "Up to 2 client vaults with client-side AES-256-GCM zero-knowledge encryption."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: currentPlan === "founder" ? "#FFD700" : COLORS.brass, fontFamily: "IBM Plex Mono, monospace" }}>
                {currentPlan === "founder" ? "LIFETIME VIP" : currentPlan === "team" ? "$19.00 / mo" : currentPlan === "pro" ? "$8.00 / mo" : "$0.00 / mo"}
              </div>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint }}>
                {currentPlan === "founder" ? "Owner Access" : currentPlan === "free" ? "No credit card needed" : "Monthly auto-renewing"}
              </div>
            </div>

            {currentPlan !== "founder" && (
              <button style={S.primaryBtnSm} onClick={onOpenUpgrade}>
                <Sparkles size={13} /> {currentPlan === "free" ? "Upgrade Plan" : "Manage Subscription"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Needed (Renews Soon) */}
      {urgentCreds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FFA296", fontSize: 12.5, fontWeight: 600 }}>
            <BellRing size={15} color="#FFA296" /> Action Needed (Renews Soon — Review or Cancel)
          </div>
          {urgentCreds.map((cred) => (
            <WatchdogItemCard
              key={cred.id}
              cred={cred}
              onEdit={() => onEditCred(cred)}
              onCancel={() => onToggleCancel(cred, true)}
            />
          ))}
        </div>
      )}

      {/* Core / Permanent Services (Quiet Auto-Renew) */}
      {permanentCreds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8FA98C", fontSize: 12.5, fontWeight: 600 }}>
            <RefreshCw size={14} color="#8FA98C" /> Core Infrastructure (Auto-Renew / Permanent)
          </div>
          {permanentCreds.map((cred) => (
            <WatchdogItemCard
              key={cred.id}
              cred={cred}
              onEdit={() => onEditCred(cred)}
              onCancel={() => onToggleCancel(cred, true)}
            />
          ))}
        </div>
      )}

      {/* Safe / Upcoming Renewals */}
      {upcomingSafeCreds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textDim, fontSize: 12.5, fontWeight: 600 }}>
            <Calendar size={15} color="#8FA98C" /> Upcoming Renewals & Active Keys
          </div>
          {upcomingSafeCreds.map((cred) => (
            <WatchdogItemCard
              key={cred.id}
              cred={cred}
              onEdit={() => onEditCred(cred)}
              onCancel={() => onToggleCancel(cred, true)}
            />
          ))}
        </div>
      )}

      {/* Savings & Cancellation History Log */}
      {canceledCreds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.brass, fontSize: 12.5, fontWeight: 600 }}>
              <History size={15} color="#B08D57" /> Savings & Cancellation History Log
            </div>
            <span style={S.savingsBadge}>
              <PiggyBank size={13} /> Total Saved: {formattedMonthlySavings}/mo
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {canceledCreds.map((c) => {
              const currency = c.currency || "$";
              const cost = parseFloat(c.cost) || 0;
              return (
                <div key={"canceled-" + c.id} style={S.historyRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...S.dialRing, width: 32, height: 32 }}>
                      <CheckCircle size={15} color="#8FA98C" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{c.label}</span>
                        <span style={S.canceledBadge}>CANCELED</span>
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>
                        Client: {c.clientName} • Project: {c.projectName}
                        {c.canceledAt ? ` • Canceled on ${new Date(c.canceledAt).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#8FA98C", fontFamily: "IBM Plex Mono, monospace" }}>
                      +{currency}{cost.toFixed(2)}/mo saved
                    </span>
                    <button
                      style={{ ...S.secondaryBtn, padding: "5px 9px", fontSize: 11 }}
                      onClick={() => onToggleCancel(c, false)}
                      title="Reactivate subscription tracking"
                    >
                      <RotateCcw size={11} /> Reactivate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trackedCreds.length === 0 && canceledCreds.length === 0 && (
        <div style={S.welcomeState}>
          <Bell size={38} color="#3A3835" />
          <div style={S.welcomeTitle}>No API Renewals Tracked Yet</div>
          <div style={{ ...S.welcomeSub, maxWidth: 440 }}>
            Attach a purchase or renewal date when adding or editing credentials (e.g. OpenAI, AWS, Twilio, Vercel) to track monthly expenses, switch plans, and get auto-debit reminders.
          </div>
        </div>
      )}
    </div>
  );
}

function WatchdogItemCard({ cred, onEdit, onCancel }) {
  const renewal = cred.renewalInfo;
  const cost = parseFloat(cred.cost);
  const currency = cred.currency || "$";
  const isPermanent = cred.alertIntent === "permanent_auto";

  return (
    <div
      style={{
        ...S.watchdogCard,
        ...(renewal?.urgency === "critical" && !isPermanent ? S.watchdogCardUrgent : {}),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ ...S.dialRing, width: 36, height: 36 }}>
          <KeyRound size={17} color={renewal?.urgency === "critical" && !isPermanent ? "#E07A6D" : "#B08D57"} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{cred.label}</span>
            {isPermanent ? (
              <span style={S.urgencyPillActive}>
                <RefreshCw size={11} /> Auto-renews ({renewal?.nextDate})
              </span>
            ) : (
              <span
                style={
                  renewal?.urgency === "critical"
                    ? S.urgencyPillCritical
                    : renewal?.urgency === "warning"
                    ? S.urgencyPillWarning
                    : S.urgencyPillActive
                }
              >
                {renewal?.daysRemaining <= 0
                  ? "Renews Today!"
                  : renewal?.daysRemaining === 1
                  ? "Renews Tomorrow!"
                  : `Renews in ${renewal?.daysRemaining}d (${renewal?.nextDate})`}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 3 }}>
            Client: <strong style={{ color: COLORS.textDim }}>{cred.clientName}</strong> • Project: <strong style={{ color: COLORS.textDim }}>{cred.projectName}</strong>
            {!isNaN(cost) && cost > 0 && ` • Cost: ${currency}${cost.toFixed(2)}/${cred.billingFrequency === "yearly" ? "yr" : "mo"}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {cred.cancelUrl && (
          <a
            href={cred.cancelUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={S.portalBtn}
            title="Direct link to provider's billing or cancellation portal"
          >
            <ExternalLink size={12} /> Cancel Portal
          </a>
        )}
        <button
          style={{ ...S.secondaryBtn, color: "#FFA296" }}
          onClick={onCancel}
          title="Mark subscription as canceled and log money saved"
        >
          <CheckCircle size={12} /> Mark Canceled
        </button>
        <button style={S.secondaryBtn} onClick={onEdit} title="Change plan tier or adjust renewal dates">
          <Edit3 size={12} /> Edit Plan
        </button>
      </div>
    </div>
  );
}
