import React, { useState, useMemo } from "react";
import {
  Layers, Copy, Check, Eye, EyeOff, Plus, AlertTriangle, Download,
  Upload, Terminal, FileCode, CheckCircle2, ShieldCheck, Search, Filter,
  Code, Sparkles, ExternalLink, Info, ArrowRight, RefreshCw
} from "lucide-react";
import { S, COLORS } from "../styles";
import {
  computeEnvironmentMatrix,
  formatAsDotEnv,
  formatAsDocker,
  formatAsShellExports,
  formatAsJSON,
  formatAsVercelJSON,
  formatAsGitHubActions
} from "../utils/envFormatters";

export default function EnvironmentStudio({
  project,
  onAddCred,
  onUpdateCred,
  onDeleteCred,
  onOpenImport,
  showSuccess
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [revealedCells, setRevealedCells] = useState({}); // `${key}_${env}` -> boolean
  const [searchFilter, setSearchFilter] = useState("");
  const [activeExportFormat, setActiveExportFormat] = useState(null); // 'dotenv' | 'docker' | 'shell' | 'json' | 'vercel' | 'github'
  const [exportTargetEnv, setExportTargetEnv] = useState("prod"); // 'prod' | 'staging' | 'dev' | 'all'
  const [selectedCategory, setSelectedCategory] = useState("all");

  const creds = project.credentials || [];
  const matrix = useMemo(() => computeEnvironmentMatrix(creds), [creds]);

  const categories = useMemo(() => {
    const set = new Set();
    matrix.rows.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return ["all", ...Array.from(set)];
  }, [matrix]);

  const filteredRows = useMemo(() => {
    return matrix.rows.filter((r) => {
      const matchesSearch =
        r.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchFilter.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [matrix, searchFilter, selectedCategory]);

  const handleCopy = (text, keyIdentifier) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    if (showSuccess) showSuccess("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const toggleReveal = (cellId) => {
    setRevealedCells((prev) => ({ ...prev, [cellId]: !prev[cellId] }));
  };

  // Filtered credentials for the active export format
  const exportVariables = useMemo(() => {
    if (exportTargetEnv === "all") return creds;
    return creds.filter((c) => {
      const e = (c.environment || "global").toLowerCase();
      return e === exportTargetEnv || e === "global";
    });
  }, [creds, exportTargetEnv]);

  const exportOutput = useMemo(() => {
    if (!activeExportFormat) return "";
    switch (activeExportFormat) {
      case "dotenv":
        return formatAsDotEnv(exportVariables, { environmentName: exportTargetEnv });
      case "docker":
        return formatAsDocker(exportVariables, "flags");
      case "shell":
        return formatAsShellExports(exportVariables);
      case "json":
        return formatAsJSON(exportVariables);
      case "vercel":
        return formatAsVercelJSON(exportVariables, exportTargetEnv === "prod" ? "production" : exportTargetEnv);
      case "github":
        return formatAsGitHubActions(exportVariables);
      default:
        return "";
    }
  }, [activeExportFormat, exportVariables, exportTargetEnv]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Banner: Stats & Export Trigger */}
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
            <Layers size={18} color={COLORS.brass} />
            <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.01em" }}>
              Environment Studio & Matrix
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 12,
                background: "rgba(176,141,87,0.15)",
                color: COLORS.brass,
                fontWeight: 600,
              }}
            >
              {matrix.totalVariables} Variables
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: "4px 0 0", lineHeight: 1.4 }}>
            Compare, audit, and export variables across Development, Staging, and Production side-by-side.
          </p>
        </div>

        {/* Action Format Chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{ ...S.actionChipBtn, color: COLORS.brass, borderColor: COLORS.brassDim }}
            onClick={() => setActiveExportFormat("dotenv")}
          >
            <Download size={13} /> <span>Export .env</span>
          </button>
          <button
            type="button"
            style={S.actionChipBtn}
            onClick={() => setActiveExportFormat("docker")}
          >
            <Terminal size={13} color={COLORS.textDim} /> <span>Docker Run</span>
          </button>
          <button
            type="button"
            style={S.actionChipBtn}
            onClick={() => setActiveExportFormat("shell")}
          >
            <Code size={13} color={COLORS.textDim} /> <span>Bash Export</span>
          </button>
          <button
            type="button"
            style={S.actionChipBtn}
            onClick={() => setActiveExportFormat("json")}
          >
            <FileCode size={13} color={COLORS.textDim} /> <span>JSON</span>
          </button>
          {onOpenImport && (
            <button
              type="button"
              style={{ ...S.actionChipBtn, background: "rgba(255,255,255,0.05)" }}
              onClick={onOpenImport}
            >
              <Upload size={13} color={COLORS.textDim} /> <span>Import .env</span>
            </button>
          )}
        </div>
      </div>

      {/* Missing Production Variables Alert */}
      {matrix.missingProd.length > 0 && (
        <div
          style={{
            background: "rgba(217, 130, 43, 0.08)",
            border: "1px solid rgba(217, 130, 43, 0.35)",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color="#D9822B" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F0A24A" }}>
                {matrix.missingProd.length} Variable(s) Missing in Production!
              </div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>
                These variables exist in Dev/Staging but have no Production or Global override:{" "}
                <span style={{ fontFamily: "monospace", color: COLORS.text }}>
                  {matrix.missingProd.map((m) => m.key).join(", ")}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            style={{ ...S.primaryBtnSm, fontSize: 11, padding: "5px 12px" }}
            onClick={() => onAddCred({ environment: "prod", title: matrix.missingProd[0].key })}
          >
            + Add {matrix.missingProd[0].key} to Prod
          </button>
        </div>
      )}

      {/* Duplicate Key Alert */}
      {matrix.duplicates.length > 0 && (
        <div
          style={{
            background: "rgba(224, 122, 109, 0.08)",
            border: "1px solid rgba(224, 122, 109, 0.3)",
            borderRadius: 10,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Info size={16} color={COLORS.red} />
          <div style={{ fontSize: 12, color: COLORS.textDim }}>
            Duplicate key definitions detected:{" "}
            <strong style={{ color: COLORS.text }}>
              {matrix.duplicates.map((d) => `${d.key} (${d.environment})`).join(", ")}
            </strong>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: 240, flex: 1, maxWidth: 360 }}>
          <Search size={14} color={COLORS.textDim} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            style={{ ...S.input, paddingLeft: 32, fontSize: 12, height: 34 }}
            placeholder="Search keys, values, notes..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        {categories.length > 2 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }} className="custodian-hscroll">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                style={{
                  ...S.secondaryBtn,
                  padding: "4px 10px",
                  fontSize: 11,
                  borderRadius: 6,
                  background: selectedCategory === cat ? "rgba(176,141,87,0.18)" : "transparent",
                  borderColor: selectedCategory === cat ? COLORS.brass : COLORS.line,
                  color: selectedCategory === cat ? COLORS.brass : COLORS.textDim,
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Environment Matrix Table */}
      {filteredRows.length === 0 ? (
        <div style={{ ...S.emptyState, padding: "36px 20px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: `1px solid ${COLORS.line}`, borderRadius: 10 }}>
          <Layers size={28} color={COLORS.textDim} style={{ margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>No environment variables match criteria</div>
          <p style={{ fontSize: 12.5, color: COLORS.textDim, maxWidth: 360, margin: "6px auto 14px" }}>
            Add your development, staging, and production environment secrets to view them side-by-side.
          </p>
          <button style={S.primaryBtnSm} onClick={() => onAddCred({ environment: "dev" })}>
            <Plus size={13} /> Add Variable
          </button>
        </div>
      ) : (
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ overflowX: "auto" }} className="custodian-hscroll">
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${COLORS.line}` }}>
                  <th style={{ padding: "10px 14px", color: COLORS.textDim, fontWeight: 600, width: "26%" }}>VARIABLE KEY</th>
                  <th style={{ padding: "10px 12px", color: "#8FA98C", fontWeight: 600, width: "24%" }}>🌐 GLOBAL / LOCAL</th>
                  <th style={{ padding: "10px 12px", color: "#7AA2E3", fontWeight: 600, width: "24%" }}>💻 DEV / STAGING</th>
                  <th style={{ padding: "10px 12px", color: "#B08D57", fontWeight: 600, width: "26%" }}>🚀 PRODUCTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const hasProd = !!row.prod || !!row.global;
                  const isMissingProd = !hasProd && row.isRequired;

                  return (
                    <tr
                      key={row.key}
                      style={{
                        borderBottom: idx !== filteredRows.length - 1 ? `1px solid ${COLORS.line}` : "none",
                        background: isMissingProd ? "rgba(217,130,43,0.03)" : "transparent",
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Key Name & Category */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, color: COLORS.text, fontSize: 12.5 }}>
                            {row.key}
                          </span>
                          {row.category && (
                            <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: COLORS.textDim }}>
                              {row.category}
                            </span>
                          )}
                        </div>
                        {row.notes && (
                          <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2, fontStyle: "italic" }}>
                            {row.notes}
                          </div>
                        )}
                      </td>

                      {/* Global Cell */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                        <EnvCell
                          inst={row.global}
                          cellId={`${row.key}_global`}
                          revealed={!!revealedCells[`${row.key}_global`]}
                          onToggleReveal={() => toggleReveal(`${row.key}_global`)}
                          onCopy={(text) => handleCopy(text, `${row.key}_global`)}
                          isCopied={copiedKey === `${row.key}_global`}
                          onAdd={() => onAddCred({ title: row.key, environment: "global" })}
                          onEdit={onUpdateCred}
                          label="Global"
                        />
                      </td>

                      {/* Dev / Staging Cell */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {row.dev && (
                            <EnvCell
                              inst={row.dev}
                              cellId={`${row.key}_dev`}
                              revealed={!!revealedCells[`${row.key}_dev`]}
                              onToggleReveal={() => toggleReveal(`${row.key}_dev`)}
                              onCopy={(text) => handleCopy(text, `${row.key}_dev`)}
                              isCopied={copiedKey === `${row.key}_dev`}
                              onEdit={onUpdateCred}
                              label="Dev"
                            />
                          )}
                          {row.staging && (
                            <EnvCell
                              inst={row.staging}
                              cellId={`${row.key}_staging`}
                              revealed={!!revealedCells[`${row.key}_staging`]}
                              onToggleReveal={() => toggleReveal(`${row.key}_staging`)}
                              onCopy={(text) => handleCopy(text, `${row.key}_staging`)}
                              isCopied={copiedKey === `${row.key}_staging`}
                              onEdit={onUpdateCred}
                              label="Staging"
                            />
                          )}
                          {!row.dev && !row.staging && !row.global && (
                            <button
                              type="button"
                              style={{ ...S.actionChipBtn, fontSize: 10.5, padding: "2px 8px", alignSelf: "flex-start", opacity: 0.6 }}
                              onClick={() => onAddCred({ title: row.key, environment: "dev" })}
                            >
                              + Add Dev
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Production Cell */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                        {row.prod ? (
                          <EnvCell
                            inst={row.prod}
                            cellId={`${row.key}_prod`}
                            revealed={!!revealedCells[`${row.key}_prod`]}
                            onToggleReveal={() => toggleReveal(`${row.key}_prod`)}
                            onCopy={(text) => handleCopy(text, `${row.key}_prod`)}
                            isCopied={copiedKey === `${row.key}_prod`}
                            onEdit={onUpdateCred}
                            label="Prod"
                            isProd
                          />
                        ) : row.global ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8FA98C", padding: "4px 0" }}>
                            <CheckCircle2 size={12} />
                            <span>Inherits 🌐 Global</span>
                            <button
                              type="button"
                              style={{ background: "none", border: "none", color: COLORS.brass, cursor: "pointer", fontSize: 10.5, textDecoration: "underline", padding: 0 }}
                              onClick={() => onAddCred({ title: row.key, environment: "prod" })}
                            >
                              Override
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#D9822B", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <AlertTriangle size={11} /> Missing
                            </span>
                            <button
                              type="button"
                              style={{ ...S.primaryBtnSm, fontSize: 10.5, padding: "3px 8px" }}
                              onClick={() => onAddCred({ title: row.key, environment: "prod" })}
                            >
                              + Add Prod
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Export Drawer / Modal */}
      {activeExportFormat && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setActiveExportFormat(null)}
        >
          <div
            style={{
              background: COLORS.panel,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: "20px 24px",
              maxWidth: 620,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={18} color={COLORS.brass} />
                <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>
                  Export Configuration ({activeExportFormat.toUpperCase()})
                </span>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 18 }}
                onClick={() => setActiveExportFormat(null)}
              >
                ✕
              </button>
            </div>

            {/* Target Environment Tabs */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: COLORS.textDim, marginRight: 4 }}>Target Env:</span>
              {[
                { id: "prod", label: "🚀 Production" },
                { id: "staging", label: "🧪 Staging" },
                { id: "dev", label: "💻 Dev" },
                { id: "all", label: "🌐 All" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  style={{
                    ...S.secondaryBtn,
                    padding: "3px 10px",
                    fontSize: 11,
                    borderRadius: 6,
                    background: exportTargetEnv === t.id ? "rgba(176,141,87,0.18)" : "transparent",
                    borderColor: exportTargetEnv === t.id ? COLORS.brass : COLORS.line,
                    color: exportTargetEnv === t.id ? COLORS.brass : COLORS.textDim,
                    fontWeight: exportTargetEnv === t.id ? 600 : 400,
                  }}
                  onClick={() => setExportTargetEnv(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Code Output Box */}
            <div style={{ position: "relative" }}>
              <textarea
                readOnly
                value={exportOutput || "# No variables match selected environment"}
                style={{
                  width: "100%",
                  height: 240,
                  background: "#0A0C10",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#E6EDF3",
                  fontFamily: "monospace",
                  fontSize: 12,
                  lineHeight: 1.5,
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  ...S.primaryBtnSm,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() => handleCopy(exportOutput, "export_modal")}
              >
                {copiedKey === "export_modal" ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === "export_modal" ? "Copied!" : "Copy Output"}</span>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: COLORS.textFaint }}>
                Plaintext generated in-memory only. Zero persistence.
              </span>
              <button
                type="button"
                style={{ ...S.secondaryBtn, padding: "6px 14px", fontSize: 12 }}
                onClick={() => setActiveExportFormat(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnvCell({ inst, cellId, revealed, onToggleReveal, onCopy, isCopied, onAdd, onEdit, label, isProd }) {
  if (!inst) {
    return (
      <button
        type="button"
        style={{ ...S.actionChipBtn, fontSize: 10.5, padding: "2px 8px", opacity: 0.6 }}
        onClick={onAdd}
      >
        + Add {label}
      </button>
    );
  }

  const rawVal = inst.password || inst.secret || inst.value || "";
  const maskedVal = "••••••••••••";

  return (
    <div
      style={{
        background: COLORS.panelAlt,
        border: `1px solid ${isProd ? "rgba(176,141,87,0.4)" : COLORS.line}`,
        borderRadius: 6,
        padding: "4px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 11.5,
          color: isProd ? COLORS.brass : COLORS.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 140,
        }}
      >
        {revealed ? rawVal : maskedVal}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", padding: 2 }}
          onClick={onToggleReveal}
          title={revealed ? "Hide Secret" : "Reveal Secret"}
        >
          {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          type="button"
          style={{ background: "none", border: "none", color: isCopied ? "#8FA98C" : COLORS.textDim, cursor: "pointer", padding: 2 }}
          onClick={() => onCopy(rawVal)}
          title="Copy Value"
        >
          {isCopied ? <Check size={12} color="#8FA98C" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}
