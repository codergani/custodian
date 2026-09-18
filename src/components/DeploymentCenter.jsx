import React, { useState } from "react";
import {
  Rocket, GitBranch, ExternalLink, Terminal, Globe, Server,
  ShieldCheck, Copy, Check, Edit3, AlertCircle, RefreshCw, Cpu
} from "lucide-react";
import { S, COLORS } from "../styles";

export default function DeploymentCenter({
  project,
  onUpdateDeployment,
  onOpenEdit,
  showSuccess
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  const details = project.details || {};
  const deployment = details.deployment || {
    repository: details.repoUrl || "",
    branch: details.branch || "main",
    platform: details.hostingProvider || "Vercel",
    productionUrl: details.productionUrl || "",
    stagingUrl: details.stagingUrl || "",
    buildCommand: details.buildCommand || "npm run build",
    deployCommand: details.deployCommand || "git push origin main",
    rollbackNotes: details.rollbackNotes || "",
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (showSuccess) showSuccess(`Copied ${key}`);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Header */}
      <div
        style={{
          background: COLORS.panelAlt,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Rocket size={18} color={COLORS.brass} />
            <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.01em" }}>
              Deployment Center & Runbook
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 12,
                background: "rgba(122, 162, 227, 0.15)",
                color: "#7AA2E3",
                fontWeight: 600,
              }}
            >
              {deployment.platform || "Custom Platform"}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: "4px 0 0", lineHeight: 1.4 }}>
            Operational deployment endpoints, repository links, build commands, and rollback instructions.
          </p>
        </div>

        <button
          type="button"
          style={{ ...S.primaryBtnSm, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}
          onClick={onOpenEdit}
        >
          <Edit3 size={13} /> <span>Edit Runbook</span>
        </button>
      </div>

      {/* Deployment Targets Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {/* Production URL Card */}
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${deployment.productionUrl ? "rgba(143,169,140,0.3)" : COLORS.line}`,
            borderRadius: 10,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={16} color="#8FA98C" />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Production Endpoint</span>
            </div>
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(143,169,140,0.15)", color: "#8FA98C", fontWeight: 600 }}>
              LIVE
            </span>
          </div>

          {deployment.productionUrl ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, padding: "8px 12px", borderRadius: 6 }}>
              <a
                href={deployment.productionUrl.startsWith("http") ? deployment.productionUrl : `https://${deployment.productionUrl}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: COLORS.brass, textDecoration: "none", fontSize: 12.5, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
              >
                {deployment.productionUrl}
              </a>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", padding: 2 }}
                  onClick={() => handleCopy(deployment.productionUrl, "prod_url")}
                  title="Copy URL"
                >
                  {copiedKey === "prod_url" ? <Check size={13} color="#8FA98C" /> : <Copy size={13} />}
                </button>
                <a
                  href={deployment.productionUrl.startsWith("http") ? deployment.productionUrl : `https://${deployment.productionUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: COLORS.textDim, padding: 2 }}
                  title="Open in new tab"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: COLORS.textFaint, fontStyle: "italic" }}>
              No production URL configured. Click "Edit Runbook" to link production domain.
            </div>
          )}
        </div>

        {/* Staging URL Card */}
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Server size={16} color="#7AA2E3" />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Staging / Preview</span>
            </div>
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(122,162,227,0.15)", color: "#7AA2E3", fontWeight: 600 }}>
              STAGING
            </span>
          </div>

          {deployment.stagingUrl ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, padding: "8px 12px", borderRadius: 6 }}>
              <a
                href={deployment.stagingUrl.startsWith("http") ? deployment.stagingUrl : `https://${deployment.stagingUrl}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#7AA2E3", textDecoration: "none", fontSize: 12.5, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
              >
                {deployment.stagingUrl}
              </a>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", padding: 2 }}
                  onClick={() => handleCopy(deployment.stagingUrl, "stage_url")}
                  title="Copy URL"
                >
                  {copiedKey === "stage_url" ? <Check size={13} color="#8FA98C" /> : <Copy size={13} />}
                </button>
                <a
                  href={deployment.stagingUrl.startsWith("http") ? deployment.stagingUrl : `https://${deployment.stagingUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: COLORS.textDim, padding: 2 }}
                  title="Open in new tab"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: COLORS.textFaint, fontStyle: "italic" }}>
              No staging URL configured.
            </div>
          )}
        </div>
      </div>

      {/* Infrastructure & Build Commands Section */}
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, display: "flex", alignItems: "center", gap: 8 }}>
          <Cpu size={16} color={COLORS.brass} />
          <span>Repository & Build Specification</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {/* Git Repository */}
          <div>
            <label style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase" }}>
              Git Repository
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <GitBranch size={14} color={COLORS.brass} />
              <span style={{ fontSize: 12.5, fontFamily: "monospace", color: COLORS.text }}>
                {deployment.repository || "Not configured"}
              </span>
              {deployment.branch && (
                <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: COLORS.textDim }}>
                  {deployment.branch}
                </span>
              )}
            </div>
          </div>

          {/* Hosting Platform */}
          <div>
            <label style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase" }}>
              Hosting Platform
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Server size={14} color={COLORS.brass} />
              <span style={{ fontSize: 12.5, color: COLORS.text }}>
                {deployment.platform || "Vercel / AWS / Custom"}
              </span>
            </div>
          </div>
        </div>

        {/* Build & Deploy Commands Terminal Snippets */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 4 }}>
          {/* Build Command */}
          <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10.5, color: COLORS.textDim, fontWeight: 600 }}>BUILD COMMAND</span>
              <button
                type="button"
                style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer" }}
                onClick={() => handleCopy(deployment.buildCommand, "build_cmd")}
              >
                {copiedKey === "build_cmd" ? <Check size={12} color="#8FA98C" /> : <Copy size={12} />}
              </button>
            </div>
            <code style={{ fontSize: 12, color: COLORS.text, fontFamily: "monospace" }}>
              {deployment.buildCommand || "npm run build"}
            </code>
          </div>

          {/* Deploy Command */}
          <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10.5, color: COLORS.textDim, fontWeight: 600 }}>DEPLOY COMMAND</span>
              <button
                type="button"
                style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer" }}
                onClick={() => handleCopy(deployment.deployCommand, "deploy_cmd")}
              >
                {copiedKey === "deploy_cmd" ? <Check size={12} color="#8FA98C" /> : <Copy size={12} />}
              </button>
            </div>
            <code style={{ fontSize: 12, color: COLORS.text, fontFamily: "monospace" }}>
              {deployment.deployCommand || "git push origin main"}
            </code>
          </div>
        </div>

        {/* Rollback & Emergency Runbook Notes */}
        {deployment.rollbackNotes && (
          <div style={{ marginTop: 4, background: "rgba(255,255,255,0.02)", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <AlertCircle size={14} color={COLORS.brass} />
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>Rollback & Incident Procedure</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textDim, whiteSpace: "pre-wrap", lineHeight: 1.5, fontFamily: "monospace" }}>
              {deployment.rollbackNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
