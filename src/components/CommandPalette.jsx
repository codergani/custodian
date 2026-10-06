import React, { useState, useEffect, useRef } from "react";
import {
  Search, ShieldCheck, Bell, Plus, KeyRound, Copy, Folder,
  Briefcase, LayoutGrid, Check
} from "lucide-react";
import { S, COLORS } from "../styles";

export default function CommandPalette({ clients, onClose, onSelectClient, onSelectProject, onCopySecret, onNavigate, onOpenModal }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState(null);
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

  // Flat array of navigable items for keyboard control
  const navigableItems = [];

  if (!q) {
    navigableItems.push(
      { id: "new-secret", action: () => onOpenModal("cred", {}) },
      { id: "sharing", action: () => onNavigate("sharing") },
      { id: "overview", action: () => onNavigate("vault") },
      { id: "personal", action: () => onNavigate("personal") },
      { id: "watchdog", action: () => onNavigate("watchdog") },
      { id: "new-client", action: () => onOpenModal("client", {}) }
    );
  } else {
    matchingCreds.slice(0, 8).forEach((cr) => {
      navigableItems.push({
        id: `cred-${cr.id}`,
        action: () => onSelectProject(cr.clientId, cr.projectId, "creds"),
      });
    });
    matchingProjects.slice(0, 5).forEach((p) => {
      navigableItems.push({
        id: `proj-${p.id}`,
        action: () => onSelectProject(p.clientId, p.id, "creds"),
      });
    });
    matchingClients.slice(0, 5).forEach((c) => {
      navigableItems.push({
        id: `client-${c.id}`,
        action: () => onSelectClient?.(c.id),
      });
    });
  }

  // Reset selectedIndex when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (navigableItems.length ? (prev + 1) % navigableItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (navigableItems.length ? (prev - 1 + navigableItems.length) % navigableItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (navigableItems[selectedIndex]) {
        navigableItems[selectedIndex].action();
      }
    }
  };

  let globalItemCounter = 0;

  return (
    <div style={S.cmdOverlay} className="custodian-cmd-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div style={S.cmdCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${COLORS.line}` }}>
          <Search size={16} color={COLORS.brass} />
          <input
            ref={inputRef}
            aria-label="Command palette search"
            style={{ ...S.cmdInput, flex: 1, border: "none", outline: "none", background: "transparent", color: COLORS.text, fontSize: 14, fontFamily: "Inter, sans-serif" }}
            placeholder="Search projects, .env keys, databases, credentials (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
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
                {[
                  {
                    icon: KeyRound,
                    color: COLORS.brass,
                    title: "+ Add New Secret / API Key",
                    badge: "AES-256",
                    action: () => onOpenModal("cred", {}),
                  },
                  {
                    icon: ShieldCheck,
                    color: COLORS.cyan,
                    title: "Zero-Knowledge Secret Sharing (ECDH)",
                    action: () => onNavigate("sharing"),
                  },
                  {
                    icon: LayoutGrid,
                    color: COLORS.brass,
                    title: "Vault Projects Overview",
                    action: () => onNavigate("vault"),
                  },
                  {
                    icon: ShieldCheck,
                    color: COLORS.green,
                    title: "Personal Space (Logins, PINs, Seed Words)",
                    action: () => onNavigate("personal"),
                  },
                  {
                    icon: Bell,
                    color: COLORS.cyan,
                    title: "SSL & Domain Renewal Watchdog",
                    action: () => onNavigate("watchdog"),
                  },
                  {
                    icon: Plus,
                    color: COLORS.green,
                    title: "Create Client Workspace",
                    action: () => onOpenModal("client", {}),
                  },
                ].map((item, idx) => {
                  const isSelected = selectedIndex === idx;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      style={{
                        ...S.cmdItem,
                        background: isSelected ? "var(--highlight-bg, rgba(176,141,87,0.12))" : "transparent",
                        borderColor: isSelected ? COLORS.brassDim : "transparent",
                      }}
                      onClick={item.action}
                      tabIndex={0}
                      role="button"
                    >
                      <Icon size={14} color={item.color} />
                      <span style={{ flex: 1, fontSize: 13, color: COLORS.text, fontWeight: isSelected ? 600 : 400 }}>{item.title}</span>
                      {item.badge && <span style={{ fontSize: 11, color: item.color }}>{item.badge}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {matchingCreds.length > 0 && (
            <div style={{ padding: "4px 14px 8px 14px" }}>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Secret Keys & .env Variables ({matchingCreds.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {matchingCreds.slice(0, 8).map((cr) => {
                  const currentIdx = globalItemCounter++;
                  const isSelected = selectedIndex === currentIdx;
                  const isCopied = copiedLabel === cr.id;
                  return (
                    <div
                      key={cr.id}
                      style={{
                        ...S.cmdItem,
                        background: isSelected ? "var(--highlight-bg, rgba(176,141,87,0.12))" : "transparent",
                        borderColor: isSelected ? COLORS.brassDim : "transparent",
                      }}
                      onClick={() => onSelectProject(cr.clientId, cr.projectId, "creds")}
                      tabIndex={0}
                      role="button"
                    >
                      <KeyRound size={13} color={COLORS.brass} />
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
                          setCopiedLabel(cr.id);
                          setTimeout(() => setCopiedLabel(null), 1500);
                        }}
                        title="Copy Key=Value .env"
                      >
                        {isCopied ? <Check size={11} color={COLORS.green} /> : <Copy size={11} />}
                        <span>{isCopied ? "Copied" : "Copy .env"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {matchingProjects.length > 0 && (
            <div style={{ padding: "4px 14px 8px 14px" }}>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Projects ({matchingProjects.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {matchingProjects.slice(0, 5).map((p) => {
                  const currentIdx = globalItemCounter++;
                  const isSelected = selectedIndex === currentIdx;
                  return (
                    <div
                      key={p.id}
                      style={{
                        ...S.cmdItem,
                        background: isSelected ? "var(--highlight-bg, rgba(176,141,87,0.12))" : "transparent",
                        borderColor: isSelected ? COLORS.brassDim : "transparent",
                      }}
                      onClick={() => onSelectProject(p.clientId, p.id, "creds")}
                      tabIndex={0}
                      role="button"
                    >
                      <Folder size={13} color={COLORS.brass} />
                      <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>
                        <span style={{ color: COLORS.textDim }}>{p.clientName} / </span>
                        <strong>{p.name}</strong>
                      </div>
                      <span style={{ fontSize: 11, color: COLORS.textFaint }}>{p.credentials?.length || 0} secrets</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {matchingClients.length > 0 && (
            <div style={{ padding: "4px 14px 8px 14px" }}>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Clients ({matchingClients.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {matchingClients.slice(0, 5).map((c) => {
                  const currentIdx = globalItemCounter++;
                  const isSelected = selectedIndex === currentIdx;
                  return (
                    <div
                      key={c.id}
                      style={{
                        ...S.cmdItem,
                        background: isSelected ? "var(--highlight-bg, rgba(176,141,87,0.12))" : "transparent",
                        borderColor: isSelected ? COLORS.brassDim : "transparent",
                      }}
                      onClick={() => onSelectClient?.(c.id)}
                      tabIndex={0}
                      role="button"
                    >
                      <Briefcase size={13} color={COLORS.brass} />
                      <div style={{ flex: 1, fontSize: 13, color: COLORS.text, fontWeight: 600 }}>
                        {c.name}
                      </div>
                      <span style={{ fontSize: 11, color: COLORS.textFaint }}>{c.projects?.length || 0} projects</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {q && matchingCreds.length === 0 && matchingProjects.length === 0 && matchingClients.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: COLORS.textDim, fontSize: 13 }}>
              No matches found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Footer Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderTop: `1px solid ${COLORS.line}`, fontSize: 11, color: COLORS.textFaint }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span><strong style={{ color: COLORS.textDim }}>↑↓</strong> Navigate</span>
            <span><strong style={{ color: COLORS.textDim }}>↵</strong> Select</span>
            <span><strong style={{ color: COLORS.textDim }}>Esc</strong> Close</span>
          </div>
          <span>Zero-Knowledge Search</span>
        </div>
      </div>
    </div>
  );
}
