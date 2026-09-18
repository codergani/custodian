export const COLORS = {
  bg: "var(--bg-main, #F8F6F1)",
  panel: "var(--panel-main, #FFFFFF)",
  panelAlt: "var(--panel-alt, #F2EEE7)",
  line: "var(--line-main, #E2DDD5)",
  text: "var(--text-main, #1A1816)",
  textDim: "var(--text-dim, #5C564E)",
  textFaint: "var(--text-faint, #8A8275)",
  brass: "var(--brass-main, #946E37)",
  brassDim: "var(--brass-dim, #785627)",
  green: "var(--green-main, #2D6A42)",
  red: "var(--red-main, #B5382B)",
};

export const S = {
  centerScreen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: COLORS.bg,
    fontFamily: "Inter, sans-serif",
    padding: 16,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    boxSizing: "border-box",
  },
  authCard: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: 380,
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 14,
    padding: "28px 26px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "var(--card-shadow, 0 4px 20px rgba(0,0,0,0.06))",
  },
  authHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  dialRing: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: `1px solid ${COLORS.brassDim}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "rgba(176,141,87,0.08)",
  },
  eyebrow: { fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.12em", color: COLORS.brass, marginBottom: 2 },
  authTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 17, fontWeight: 600, color: COLORS.text, margin: 0 },
  authSub: { fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.5, margin: "0 0 6px" },
  label: { fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", marginTop: 4 },
  input: {
    boxSizing: "border-box",
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: COLORS.text,
    fontSize: 13.5,
    fontFamily: "Inter, sans-serif",
    width: "100%",
  },
  errBox: {
    boxSizing: "border-box",
    display: "flex", alignItems: "center", gap: 6, color: COLORS.red, fontSize: 12,
    background: "rgba(192,107,95,0.1)", border: `1px solid rgba(192,107,95,0.3)`, borderRadius: 8, padding: "8px 10px",
    width: "100%",
  },
  infoBox: {
    boxSizing: "border-box",
    display: "flex", alignItems: "center", gap: 6, color: COLORS.green, fontSize: 12,
    background: "rgba(143,169,140,0.1)", border: `1px solid rgba(143,169,140,0.3)`, borderRadius: 8, padding: "8px 10px",
    width: "100%",
  },
  primaryBtn: {
    boxSizing: "border-box",
    width: "100%",
    marginTop: 6, background: COLORS.brass, color: "var(--primary-btn-text, #FFFFFF)", border: "none", borderRadius: 8,
    padding: "11px 14px", fontSize: 13.5, fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: "pointer",
  },
  primaryBtnSm: {
    background: COLORS.brass, color: "var(--primary-btn-text, #FFFFFF)", border: "none", borderRadius: 7, padding: "8px 12px",
    fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
  },
  secondaryBtn: {
    background: "transparent", color: COLORS.textDim, border: `1px solid ${COLORS.line}`, borderRadius: 7,
    padding: "8px 12px", fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },
  dangerBtn: {
    background: "transparent", color: COLORS.red, border: `1px solid rgba(192,107,95,0.35)`, borderRadius: 7,
    padding: "8px 10px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
  },
  oauthBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    background: COLORS.panelAlt, color: COLORS.text, border: `1px solid ${COLORS.line}`, borderRadius: 8,
    padding: "10px 14px", fontSize: 13, fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: "pointer",
  },
  securityGuaranteeBadge: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    background: "var(--highlight-bg, rgba(148, 110, 55, 0.08))",
    border: `1px solid var(--line-main, #E2DDD5)`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 11.5,
    color: COLORS.textDim,
    lineHeight: 1.45,
    marginTop: 6,
  },
  formSecurityNotice: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    color: COLORS.green,
    background: "rgba(45, 106, 66, 0.08)",
    border: `1px solid rgba(45, 106, 66, 0.22)`,
    borderRadius: 6,
    padding: "6px 10px",
  },
  dividerRow: { display: "flex", alignItems: "center", margin: "6px 0", gap: 10 },
  dividerLine: { flex: 1, height: 1, background: COLORS.line },
  dividerText: { fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" },
  authLinks: { display: "flex", justifyContent: "space-between", marginTop: 8 },
  linkText: { fontSize: 11.5, color: COLORS.brass, cursor: "pointer" },

  app: { display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "Inter, sans-serif", color: COLORS.text },
  sidebar: { width: 250, borderRight: `1px solid ${COLORS.line}`, background: "var(--sidebar-bg, #F5EFE6)", display: "flex", flexDirection: "column", padding: "16px 12px", gap: 10 },
  sidebarHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px 6px" },
  brandRow: { display: "flex", alignItems: "center", gap: 7 },
  brandText: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", color: COLORS.text },
  addClientBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(176,141,87,0.1)",
    border: `1px dashed ${COLORS.brassDim}`, color: COLORS.brass, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  tree: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, marginTop: 4 },
  emptyTree: { fontSize: 11.5, color: COLORS.textFaint, padding: "10px 6px", lineHeight: 1.5 },
  treeClientRow: { display: "flex", alignItems: "center", gap: 6, padding: "7px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12.5 },
  treeProjectRow: { display: "flex", alignItems: "center", gap: 6, padding: "6px 6px 6px 26px", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  treeRowActive: { background: "rgba(176,141,87,0.14)" },
  treeLabel: { flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS.text },
  treeCount: { fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: COLORS.textFaint },
  addProjectRow: { display: "flex", alignItems: "center", gap: 6, padding: "6px 6px 6px 26px", fontSize: 11, color: COLORS.textFaint, cursor: "pointer" },

  main: { flex: 1, padding: "22px 26px", overflowY: "auto" },
  mainHeadRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" },
  mainTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 22, fontWeight: 600, margin: 0, color: COLORS.text },
  headActions: { display: "flex", gap: 8 },
  emptyState: { fontSize: 12.5, color: COLORS.textFaint, padding: "20px 0" },
  welcomeState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 10, textAlign: "center" },
  welcomeTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.textDim },
  welcomeSub: { fontSize: 12.5, color: COLORS.textFaint, maxWidth: 280, lineHeight: 1.5 },

  projectGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 },
  projectTile: { background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "16px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 },
  projectTileAdd: { background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 10, padding: "16px 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: COLORS.textFaint, fontSize: 12.5 },
  projectTileName: { fontFamily: "Space Grotesk, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text },
  projectTileMeta: { fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" },

  credGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
  credCard: { background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  credCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  credLabel: { fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text },
  fieldRow: { display: "flex", alignItems: "center", gap: 8, background: COLORS.panelAlt, borderRadius: 7, padding: "6px 9px" },
  fieldLabel: { fontSize: 9.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", width: 60, flexShrink: 0 },
  fieldValue: { flex: 1, fontSize: 12.5, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  mono: { fontFamily: "IBM Plex Mono, monospace" },
  fieldActions: { display: "flex", gap: 2, flexShrink: 0 },
  iconBtnGhost: { background: "transparent", border: "none", color: COLORS.textFaint, cursor: "pointer", padding: 5, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },

  overlay: {
    position: "fixed", inset: 0, background: "var(--modal-overlay-bg, rgba(28,24,18,0.48))",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 50, padding: 16, overflowY: "auto", WebkitOverflowScrolling: "touch",
    boxSizing: "border-box",
  },
  modalCard: {
    boxSizing: "border-box", width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "20px 22px 22px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },

  planBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em", padding: "3px 8px",
    borderRadius: 20, border: `1px solid ${COLORS.brassDim}`, color: COLORS.brass, textTransform: "uppercase",
  },
  planBadgePro: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em", padding: "3px 8px",
    borderRadius: 20, border: `1px solid #8FA98C`, color: "#8FA98C", textTransform: "uppercase",
  },
  planBadgeTeam: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.06em", padding: "3px 8px",
    borderRadius: 20, border: `1px solid #C49B66`, color: "#C49B66", textTransform: "uppercase",
  },

  upgradeModalCard: {
    boxSizing: "border-box", width: "100%", maxWidth: 740, maxHeight: "88vh", overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    background: COLORS.panel, border: `1px solid ${COLORS.line}`,
    borderRadius: 16, padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 18,
  },
  planGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
  },
  pricingCard: {
    background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "18px 16px",
    display: "flex", flexDirection: "column", gap: 12, position: "relative",
  },
  pricingCardPopular: {
    background: "rgba(176,141,87,0.06)", border: `1.5px solid ${COLORS.brass}`,
  },
  pricingCardCurrent: {
    background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.brassDim}`,
  },
  popularTag: {
    position: "absolute", top: -10, right: 14, background: COLORS.brass, color: "#1A1611",
    fontSize: 10, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", padding: "2px 8px",
    borderRadius: 12, textTransform: "uppercase", letterSpacing: "0.05em",
  },
  pricingTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.text },
  pricingPrice: { fontFamily: "Space Grotesk, sans-serif", fontSize: 24, fontWeight: 700, color: COLORS.text },
  pricingPeriod: { fontSize: 12, color: COLORS.textFaint, fontWeight: 400 },
  pricingDesc: { fontSize: 11.5, color: COLORS.textDim, lineHeight: 1.4 },
  featureList: { display: "flex", flexDirection: "column", gap: 7, marginTop: 4, flex: 1 },
  featureItem: { display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: COLORS.textDim },
  sidebarUpgradeBox: {
    margin: "auto 0 0", padding: "12px", background: "rgba(176,141,87,0.07)",
    border: `1px solid rgba(176,141,87,0.25)`, borderRadius: 10, display: "flex", flexDirection: "column", gap: 8,
  },
  trashBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: "0.04em", padding: "2px 7px",
    borderRadius: 6, background: "rgba(192,107,95,0.12)", color: "#E07A6D", border: `1px solid rgba(192,107,95,0.25)`,
  },
  trashCard: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  restoreBtn: {
    background: "rgba(143,169,140,0.12)", color: "#9FC39C", border: `1px solid rgba(143,169,140,0.3)`,
    borderRadius: 7, padding: "7px 11px", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
  },

  textarea: {
    boxSizing: "border-box",
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: COLORS.text,
    fontSize: 12.5,
    fontFamily: "IBM Plex Mono, monospace",
    width: "100%",
    minHeight: 140,
    resize: "vertical",
    lineHeight: 1.5,
  },
  codeBox: {
    boxSizing: "border-box",
    background: "#141312",
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: "12px 14px",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 12,
    color: "#D6D1C9",
    maxHeight: 220,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    lineHeight: 1.5,
  },
  planBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, padding: "2px 7px", borderRadius: 6,
    background: "rgba(255,255,255,0.06)", color: COLORS.textDim, border: `1px solid ${COLORS.line}`, textTransform: "uppercase",
  },
  planBadgePro: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, padding: "2px 7px", borderRadius: 6,
    background: "rgba(176,141,87,0.15)", color: COLORS.brass, border: `1px solid ${COLORS.brassDim}`, textTransform: "uppercase",
  },
  planBadgeTeam: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, padding: "2px 7px", borderRadius: 6,
    background: "rgba(143,169,140,0.15)", color: "#8FA98C", border: `1px solid rgba(143,169,140,0.3)`, textTransform: "uppercase",
  },
  planBadgeFounder: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, padding: "2px 8px", borderRadius: 6,
    background: "linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(176,141,87,0.25) 100%)",
    color: "#FFD700", border: `1px solid rgba(255,215,0,0.5)`, textTransform: "uppercase", fontWeight: 700,
  },
  rolePillOwner: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, padding: "2px 7px", borderRadius: 12,
    background: "rgba(176,141,87,0.15)", color: COLORS.brass, border: `1px solid ${COLORS.brassDim}`,
  },
  rolePillMember: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, padding: "2px 7px", borderRadius: 12,
    background: "rgba(143,169,140,0.15)", color: "#8FA98C", border: `1px solid rgba(143,169,140,0.3)`,
  },
  rolePillRestricted: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, padding: "2px 7px", borderRadius: 12,
    background: "rgba(224,122,109,0.15)", color: "#E07A6D", border: `1px solid rgba(224,122,109,0.3)`,
  },
  pendingBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, padding: "2px 7px", borderRadius: 12,
    background: "rgba(176,141,87,0.15)", color: "#E0B77D", border: `1px solid rgba(176,141,87,0.4)`,
    display: "inline-flex", alignItems: "center", gap: 3,
  },
  activeBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, padding: "2px 7px", borderRadius: 12,
    background: "rgba(143,169,140,0.15)", color: "#A7CCA4", border: `1px solid rgba(143,169,140,0.4)`,
    display: "inline-flex", alignItems: "center", gap: 3,
  },
  memberRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px",
  },

  // Watchdog & Renewal Styles
  watchdogCounter: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700, padding: "1px 6px",
    borderRadius: 10, background: "#E07A6D", color: "#1A1611", marginLeft: "auto",
  },
  watchdogStatGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 8,
  },
  watchdogStatCard: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 6,
  },
  watchdogStatLabel: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: COLORS.textFaint, letterSpacing: "0.04em", textTransform: "uppercase",
  },
  watchdogStatValue: {
    fontFamily: "Space Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text,
  },
  watchdogCard: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "border-color 0.15s",
  },
  watchdogCardUrgent: {
    background: "rgba(224,122,109,0.04)", border: `1px solid rgba(224,122,109,0.35)`,
  },
  urgencyPillCritical: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: "0.03em", padding: "2px 8px",
    borderRadius: 6, background: "rgba(224,122,109,0.18)", color: "#FFA296", border: `1px solid rgba(224,122,109,0.4)`,
    fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
  },
  urgencyPillWarning: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: "0.03em", padding: "2px 8px",
    borderRadius: 6, background: "rgba(176,141,87,0.18)", color: "#E0B77D", border: `1px solid rgba(176,141,87,0.4)`,
    fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
  },
  urgencyPillActive: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: "0.03em", padding: "2px 8px",
    borderRadius: 6, background: "rgba(143,169,140,0.15)", color: COLORS.green, border: `1px solid rgba(143,169,140,0.3)`,
    fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4,
  },
  portalBtn: {
    background: "rgba(176,141,87,0.12)", color: COLORS.brass, border: `1px solid ${COLORS.brassDim}`,
    borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 500, display: "inline-flex", alignItems: "center",
    gap: 4, cursor: "pointer", textDecoration: "none",
  },
  clientSpendBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "3px 8px", borderRadius: 6,
    background: "rgba(176,141,87,0.1)", color: COLORS.brass, border: `1px solid ${COLORS.brassDim}`,
    display: "inline-flex", alignItems: "center", gap: 5,
  },
  savingsStatCard: {
    background: "var(--panel-main, #FFFFFF)", border: `1px solid ${COLORS.line}`, borderRadius: 10,
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6,
    boxShadow: "var(--card-shadow)",
  },
  savingsBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700, padding: "2px 8px",
    borderRadius: 6, background: "rgba(45,106,66,0.12)", color: COLORS.green, border: `1px solid rgba(45,106,66,0.3)`,
    display: "inline-flex", alignItems: "center", gap: 4,
  },
  canceledBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: "0.03em", padding: "2px 8px",
    borderRadius: 6, background: "rgba(143,169,140,0.15)", color: COLORS.green, border: `1px solid rgba(143,169,140,0.3)`,
    fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
  },
  intentToggleBtn: {
    flex: 1, padding: "8px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: "none",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    transition: "all 0.15s ease",
  },
  historyRow: {
    background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 14px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
  },

  // Project Tabs & Delivery Tracker
  projectSubActionsBar: {
    display: "flex", gap: 8, marginBottom: 12,
    overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
    flexWrap: "nowrap", alignItems: "center", paddingBottom: 2,
  },
  actionChipBtn: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 8,
    padding: "7px 12px", fontSize: 12, fontWeight: 500, color: COLORS.text,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s ease",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)", outline: "none",
  },
  projectTabNav: {
    display: "flex", gap: 8, borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 10, marginBottom: 16,
    overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
  },
  projectTabBtn: {
    background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 15px",
    fontSize: 12.5, fontWeight: 600, color: COLORS.textDim, cursor: "pointer", display: "flex", alignItems: "center",
    gap: 7, transition: "all 0.15s ease", outline: "none", userSelect: "none", flexShrink: 0,
  },
  projectTabBtnActive: {
    background: "var(--highlight-bg, rgba(148,110,55,0.12))",
    borderColor: COLORS.brass, color: COLORS.brass, boxShadow: "0 1px 4px rgba(148,110,55,0.15)",
  },
  deadlineGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 14,
  },
  deadlineCard: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 6, position: "relative",
    boxShadow: "var(--card-shadow)",
  },
  greyDaysCard: {
    background: "rgba(45,106,66,0.06)", border: `1px solid rgba(45,106,66,0.25)`, borderRadius: 10,
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6,
  },
  countdownTimerPill: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700, padding: "3px 9px",
    borderRadius: 6, background: "rgba(181,56,43,0.12)", color: COLORS.red, border: `1px solid rgba(181,56,43,0.3)`,
    display: "inline-flex", alignItems: "center", gap: 5,
  },
  scopeInfoBanner: {
    background: "var(--highlight-bg, rgba(148,110,55,0.08))", border: `1px solid ${COLORS.line}`, borderRadius: 8,
    padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    fontSize: 12, color: COLORS.textDim,
  },
  checklistItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 12px", transition: "border-color 0.15s",
  },
  progressBarBg: {
    width: "100%", height: 6, background: COLORS.panelAlt, borderRadius: 4, overflow: "hidden", border: `1px solid ${COLORS.line}`,
  },
  progressBarFill: {
    height: "100%", background: COLORS.green, borderRadius: 4, transition: "width 0.3s ease",
  },

  // Owner Command Center Dashboard
  ownerHeaderCard: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "18px 20px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
    boxShadow: "var(--card-shadow)",
  },
  quickStartCard: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 14,
    padding: "24px 26px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxShadow: "var(--card-shadow)",
  },
  overviewProjectCard: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 12, cursor: "pointer",
    boxShadow: "var(--card-shadow)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  overviewOpenBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: "var(--highlight-bg, rgba(148,110,55,0.08))", border: `1px solid ${COLORS.brassDim}`,
    color: COLORS.brass, borderRadius: 7, padding: "7px 12px", fontSize: 12,
    fontWeight: 600, marginTop: 4, width: "100%", boxSizing: "border-box",
  },
  breadcrumbBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`, borderRadius: 8, marginBottom: 14,
    fontSize: 12, color: COLORS.textDim, flexWrap: "wrap", gap: 8,
  },

  // Founder SuperAdmin HQ
  founderBanner: {
    background: "linear-gradient(135deg, var(--highlight-bg, rgba(148,110,55,0.12)) 0%, var(--panel-main, #FFFFFF) 100%)",
    border: `1.5px solid ${COLORS.brass}`, borderRadius: 14, padding: "20px 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
    boxShadow: "var(--card-shadow)",
  },
  founderRevenueCard: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 6,
    boxShadow: "var(--card-shadow)",
  },
  userTableRow: {
    background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 14px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
  },

  // Environment Badges
  envBadgeDev: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700, padding: "2px 7px",
    borderRadius: 5, background: "rgba(100,160,240,0.15)", color: "#2B6CB0", border: "1px solid rgba(100,160,240,0.35)",
    textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 3,
  },
  envBadgeStaging: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700, padding: "2px 7px",
    borderRadius: 5, background: "rgba(235,165,60,0.15)", color: "#C0751A", border: "1px solid rgba(235,165,60,0.35)",
    textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 3,
  },
  envBadgeProd: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700, padding: "2px 7px",
    borderRadius: 5, background: "rgba(181,56,43,0.12)", color: COLORS.red, border: "1px solid rgba(181,56,43,0.35)",
    textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 3,
  },
  envBadgeGlobal: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700, padding: "2px 7px",
    borderRadius: 5, background: COLORS.panelAlt, color: COLORS.textDim, border: `1px solid ${COLORS.line}`,
    textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 3,
  },

  // Security Health Audit Score Card
  healthMeterCard: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
    boxShadow: "var(--card-shadow)",
  },
  healthBadgeGood: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700, padding: "3px 9px",
    borderRadius: 6, background: "rgba(45,106,66,0.12)", color: COLORS.green, border: "1px solid rgba(45,106,66,0.3)",
    display: "inline-flex", alignItems: "center", gap: 4,
  },
  healthBadgeWarning: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700, padding: "3px 9px",
    borderRadius: 6, background: "rgba(235,165,60,0.15)", color: "#C0751A", border: "1px solid rgba(235,165,60,0.4)",
    display: "inline-flex", alignItems: "center", gap: 4,
  },

  // Command Palette
  cmdOverlay: {
    position: "fixed", inset: 0, background: "var(--modal-overlay-bg, rgba(28,24,18,0.48))", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "8vh",
    zIndex: 9999, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 12px",
    boxSizing: "border-box",
  },
  cmdCard: {
    maxWidth: 580, width: "100%", background: COLORS.panel, border: `1.5px solid ${COLORS.brassDim}`,
    borderRadius: 12, boxShadow: "var(--card-shadow, 0 24px 60px rgba(0,0,0,0.15))", overflow: "hidden", display: "flex",
    flexDirection: "column", boxSizing: "border-box",
  },
  cmdInputRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${COLORS.line}`,
    background: COLORS.panelAlt,
  },
  cmdInput: {
    flex: 1, background: "transparent", border: "none", color: COLORS.text, fontSize: 15, outline: "none",
    fontFamily: "Inter, sans-serif",
  },
  cmdList: {
    maxHeight: "55vh", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px", display: "flex", flexDirection: "column", gap: 2,
  },
  cmdItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px",
    borderRadius: 8, cursor: "pointer", fontSize: 13, color: COLORS.text, transition: "background 0.1s",
  },
  cmdItemActive: {
    background: "var(--highlight-bg, rgba(148,110,55,0.12))", color: COLORS.brass,
  },
  
  // Instant Copy Fast Badge
  instantCopyBtn: {
    background: "rgba(148,110,55,0.08)", border: `1px solid ${COLORS.brassDim}`, color: COLORS.brass,
    borderRadius: 5, padding: "2px 7px", fontSize: 11, fontFamily: "IBM Plex Mono, monospace",
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "all 0.15s ease",
  },

  // ──── Workspace (Store Room) Styles ────
  workspaceTopBar: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap",
  },
  workspaceSearchInput: {
    boxSizing: "border-box", background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`,
    borderRadius: 8, padding: "8px 12px 8px 34px", color: COLORS.text, fontSize: 13,
    fontFamily: "Inter, sans-serif", flex: "1 1 220px", minWidth: 180, outline: "none",
  },
  workspaceGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14,
  },
  workspaceCard: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12,
    overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
    boxShadow: "var(--card-shadow)",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  workspaceCardHover: {
    borderColor: COLORS.brassDim, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  workspaceCardThumb: {
    width: "100%", height: 140, objectFit: "cover", display: "block", background: COLORS.panelAlt,
  },
  workspaceCardIconArea: {
    width: "100%", height: 140, display: "flex", alignItems: "center", justifyContent: "center",
    background: COLORS.panelAlt,
  },
  workspaceCardTextPreview: {
    width: "100%", height: 140, padding: "12px 14px", background: COLORS.panelAlt,
    fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", color: COLORS.textDim,
    lineHeight: 1.5, overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
  workspaceCardBody: {
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1,
  },
  workspaceCardTitle: {
    fontFamily: "Space Grotesk, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  workspaceCardMeta: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
  },
  workspaceTypeBadge: {
    fontFamily: "IBM Plex Mono, monospace", fontSize: 9.5, letterSpacing: "0.04em", padding: "2px 7px",
    borderRadius: 5, textTransform: "uppercase", fontWeight: 500,
  },
  workspaceTagChip: {
    fontSize: 10, padding: "1px 6px", borderRadius: 4, background: COLORS.panelAlt,
    color: COLORS.textDim, border: `1px solid ${COLORS.line}`, fontFamily: "IBM Plex Mono, monospace",
  },
  workspaceSizeBadge: {
    fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace",
  },
  workspaceCardActions: {
    display: "flex", gap: 2, padding: "0 14px 12px", flexWrap: "wrap",
  },

  // Storage Meter
  storageMeter: {
    display: "flex", alignItems: "center", gap: 10, padding: "6px 14px",
    background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8,
    flex: "0 0 auto",
  },
  storageMeterBarBg: {
    width: 100, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.08)", overflow: "hidden",
  },
  storageMeterBarFill: {
    height: "100%", borderRadius: 3, transition: "width 0.3s ease, background 0.3s ease",
  },
  storageMeterText: {
    fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: COLORS.textDim, whiteSpace: "nowrap",
  },

  // Drop Zone
  dropZone: {
    boxSizing: "border-box", width: "100%", minHeight: 160, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 8,
    border: `2px dashed ${COLORS.line}`, borderRadius: 12, background: "rgba(0,0,0,0.02)",
    color: COLORS.textFaint, fontSize: 13, cursor: "pointer", transition: "all 0.15s ease",
    padding: 20,
  },
  dropZoneActive: {
    borderColor: COLORS.brass, background: "var(--highlight-bg, rgba(148,110,55,0.08))", color: COLORS.brass,
  },

  // Filter chips row
  workspaceFilterRow: {
    display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
    overflowX: "auto", WebkitOverflowScrolling: "touch", flexWrap: "nowrap",
    paddingBottom: 4, scrollbarWidth: "none",
  },
  workspaceFilterChip: {
    fontSize: 12, padding: "5px 12px", borderRadius: 7, border: `1px solid ${COLORS.line}`,
    background: "transparent", color: COLORS.textDim, cursor: "pointer",
    fontFamily: "Inter, sans-serif", transition: "all 0.12s ease",
    flexShrink: 0, whiteSpace: "nowrap",
  },
  workspaceFilterChipActive: {
    borderColor: COLORS.brassDim, background: "var(--highlight-bg, rgba(148,110,55,0.12))", color: COLORS.brass,
  },
};

