import React, { useState, useEffect, useRef } from "react";
import {
  Search, ShieldCheck, Bell, Plus, KeyRound, Copy, Folder,
  Layers, Rocket, Terminal, Code, Cpu
} from "lucide-react";
import { S, COLORS } from "../styles";

export default function CommandPalette({ clients, onClose, onSelectProject, onCopySecret, onNavigate, onOpenModal }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.toLowerCase().trim();

  const matchingProjects = [];
  const matchingCreds = [];
  const matchingClients = [];

  (clients || []).forEach((c) => {
    if (c.name.toLowerCase().includes(q)) {
      matchingClients.push(c);
    }
    (c.projects || []).forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matchingProjects.push({ ...p, clientName: c.name, clientId: c.id });
      }
      (p.credentials || []).forEach((cr) => {
        if (
          cr.label.toLowerCase().includes(q) ||
          (cr.username && cr.username.toLowerCase().includes(q)) ||
          (cr.environment && cr.environment.toLowerCase().includes(q)) ||
          (cr.secretType && cr.secretType.toLowerCase().includes(q))
        ) {
          matchingCreds.push({
            ...cr,
            projectName: p.name,
            projectId: p.id,
            clientName: c.name,
            clientId: c.id,
          });
        }
      });
    });
  });

  return (
    <div style={S.cmdOverlay} className="custodian-cmd-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div style={S.cmdCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${COLORS.line}` }}>
          <Search size={16} color={COLORS.brass} />
          <input
            ref={inputRef}
            aria-label="Command palette search"
            style={{ ...S.cmdInput, flex: 1, border: "none", outline: "none", background: "transparent", color: COLORS.text, fontSize: 14, fontFamily: "Inter, sans-serif" }}
            placeholder="Search projects, .env keys, databases, deployment runbooks (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>
            ESC
          </span>
        </div>

        <div style={{ maxHeight: "58vh", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px 0" }}>
          {!q && (
            <div style={{ padding: "4px 14px 8px 14px" }}>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Developer Quick Commands
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={S.cmdItem} onClick={() => onNavigate("vault")} tabIndex={0} role="button">
                  <ShieldCheck size={14} color="#B08D57" />
                  <span style={{ flex: 1, fontSize: 13, color: COLORS.text }}>Vault Projects Overview</span>
                </div>
                <div style={S.cmdItem} onClick={() => onNavigate("watchdog")} tabIndex={0} role="button">
                  <Bell size={14} color="#B08D57" />
                  <span style={{ flex: 1, fontSize: 13, color: COLORS.text }}>SSL & Domain Renewal Watchdog</span>
                </div>
                <div style={S.cmdItem} onClick={() => onOpenModal("client", {})} tabIndex={0} role="button">
                  <Plus size={14} color="#8FA98C" />
                  <span style={{ flex: 1, fontSize: 13, color: COLORS.text }}>Create Client Workspace</span>
                </div>
              </div>
            </div>
          )}

          {matchingCreds.length > 0 && (
            <div style={{ padding: "4px 14px 8px 14px" }}>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Secret Keys & .env Variables ({matchingCreds.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {matchingCreds.slice(0, 8).map((cr) => (
                  <div key={cr.id} style={S.cmdItem} onClick={() => onSelectProject(cr.clientId, cr.projectId, "creds")} tabIndex={0} role="button">
                    <KeyRound size={13} color="#B08D57" />
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{cr.label}</span>
                      <span style={{ fontSize: 11, color: COLORS.textDim }}>({cr.clientName} &gt; {cr.projectName})</span>
                      {cr.secretType && (
                        <span style={{ fontSize: 9.5, padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.06)", color: COLORS.brass }}>
                          {cr.secretType.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      style={S.instantCopyBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopySecret(`${cr.username || cr.label}=${cr.password || ""}`, cr.label);
                      }}
                      title="Copy Key=Value .env"
                    >
                      <Copy size={11} /> Copy .env
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchingProjects.length > 0 && (
            <div style={{ padding: "4px 14px 8px 14px" }}>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Projects ({matchingProjects.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {matchingProjects.slice(0, 5).map((p) => (
                  <div key={p.id} style={S.cmdItem} onClick={() => onSelectProject(p.clientId, p.id, "env_studio")} tabIndex={0} role="button">
                    <Folder size={13} color="#B08D57" />
                    <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>
                      <strong style={{ color: COLORS.brass }}>{p.clientName}</strong> &gt; {p.name}
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.textFaint }}>{p.credentials?.length || 0} secrets</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q && matchingCreds.length === 0 && matchingProjects.length === 0 && matchingClients.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: COLORS.textDim, fontSize: 13 }}>
              No matches found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

