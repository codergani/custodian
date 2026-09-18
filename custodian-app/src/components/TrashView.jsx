import React, { useState } from "react";
import { Trash2, KeyRound, Folder, Building2, RotateCcw, Ghost, Download, Crown, Sparkles } from "lucide-react";
import { S, COLORS } from "../styles";
import { ConfirmModal } from "./shared";

export default function TrashView({
  trashedItems = {},
  ghostedClients = [],
  onRestoreCred,
  onRestoreProject,
  onRestoreClient,
  onReactivateGhostedClient,
  onDownloadGhostedZip,
  onPermanentDelete,
  onEmptyTrash,
  currentPlan = "free",
  onOpenUpgrade,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  function getDaysRemaining(deletedAt) {
    if (!deletedAt) return 30;
    const deletedTime = new Date(deletedAt).getTime();
    const expireTime = deletedTime + 30 * 24 * 60 * 60 * 1000;
    const diffMs = expireTime - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  const { credentials = [], projects = [], clients = [] } = trashedItems;
  const regularTrashCount = credentials.length + projects.length + clients.length;
  const grandTotalCount = regularTrashCount + ghostedClients.length;

  const showGhosted = activeTab === "all" || activeTab === "ghosted";
  const showCreds = activeTab === "all" || activeTab === "secrets";
  const showProjects = activeTab === "all" || activeTab === "projects";
  const showClients = activeTab === "all" || activeTab === "clients";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.mainHeadRow}>
        <div>
          <div style={S.eyebrow}>RECYCLE BIN</div>
          <h2 style={S.mainTitle}>Trash & Recovery</h2>
          <div style={{ fontSize: 12.5, color: COLORS.textDim, marginTop: 4 }}>
            Deleted items remain safely here for 30 days before being automatically purged.
          </div>
        </div>
        {regularTrashCount > 0 && (
          <button
            style={S.dangerBtn}
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: "Empty Trash",
                message: "Are you sure you want to permanently delete all items in trash? This cannot be undone.",
                onConfirm: onEmptyTrash,
              });
            }}
          >
            <Trash2 size={13} /> Empty Trash
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 10, flexWrap: "wrap" }}>
        {[
          { id: "all", label: `All (${grandTotalCount})` },
          { id: "ghosted", label: `👻 Ghosted Vault (${ghostedClients.length})` },
          { id: "secrets", label: `Secrets (${credentials.length})` },
          { id: "projects", label: `Projects (${projects.length})` },
          { id: "clients", label: `Clients (${clients.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            style={{
              background: activeTab === tab.id ? "rgba(176,141,87,0.15)" : "transparent",
              color: activeTab === tab.id ? COLORS.brass : COLORS.textDim,
              border: `1px solid ${activeTab === tab.id ? COLORS.brassDim : COLORS.line}`,
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {grandTotalCount === 0 ? (
        <div style={S.welcomeState}>
          <Trash2 size={36} color="#3A3835" />
          <div style={S.welcomeTitle}>Trash is empty</div>
          <div style={S.welcomeSub}>
            When you delete a secret, project, or client, you'll have 30 days to restore it from here.
          </div>
        </div>
      ) : activeTab === "ghosted" && ghostedClients.length === 0 ? (
        <div style={S.welcomeState}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(176,141,87,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Ghost size={24} color={COLORS.brass} />
          </div>
          <div style={S.welcomeTitle}>No Ghosted Clients</div>
          <div style={S.welcomeSub}>
            When a client cancels or pauses their project, Pro and Team users can archive their workspace into a compressed .zip vault. When the client returns, restore them here in 1 click!
          </div>
          {currentPlan === "free" && onOpenUpgrade && (
            <button
              style={{ ...S.primaryBtnSm, marginTop: 14 }}
              onClick={onOpenUpgrade}
            >
              <Crown size={13} /> Upgrade to Pro to Enable Ghosted Vault
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {showGhosted &&
            ghostedClients.map((client) => {
              const totalSecrets = (client.projects || []).reduce((acc, p) => acc + (p.credentials?.length || 0), 0);
              const formattedGhostDate = client.ghosted_at
                ? new Date(client.ghosted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : "Archived";
              return (
                <div
                  key={"ghost-" + client.id}
                  style={{
                    ...S.trashCard,
                    border: "1px solid rgba(176,141,87,0.3)",
                    background: "rgba(176,141,87,0.03)",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ ...S.dialRing, width: 38, height: 38, background: "rgba(176,141,87,0.12)", flexShrink: 0 }}>
                        <Ghost size={18} color="#B08D57" />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{client.name}</span>
                          <span style={{ ...S.trashBadge, background: "rgba(176,141,87,0.15)", color: COLORS.brass, borderColor: COLORS.brassDim }}>
                            👻 GHOSTED / CANCELLED
                          </span>
                          <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
                            {formattedGhostDate}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: COLORS.textDim, marginTop: 4 }}>
                          <span>📁 {client.projects?.length || 0} Projects</span>
                          <span>•</span>
                          <span>🔑 {totalSecrets} Encrypted Secrets</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        style={{ ...S.primaryBtnSm, padding: "5px 12px", fontSize: 11.5 }}
                        onClick={() => onReactivateGhostedClient(client)}
                        title="Restore this client to active vault"
                      >
                        <RotateCcw size={12} /> Reactivate Client
                      </button>
                      <button
                        style={{ ...S.secondaryBtn, padding: "5px 10px", fontSize: 11.5 }}
                        onClick={() => onDownloadGhostedZip(client)}
                        title="Download .zip archive of all credentials and project specs"
                      >
                        <Download size={12} /> Download ZIP
                      </button>
                      <button
                        style={{ ...S.dangerBtn, padding: "5px 10px", fontSize: 11.5 }}
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: "Delete Ghosted Client Forever",
                            message: `Are you sure you want to permanently delete ghosted client "${client.name}" and all associated data?`,
                            onConfirm: () => onPermanentDelete("client", client.id, client.name),
                          });
                        }}
                        title="Permanently Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {client.ghost_notes && (
                    <div style={{ padding: "8px 12px", background: COLORS.panelAlt, borderRadius: 6, border: `1px solid ${COLORS.line}`, fontSize: 11.5, color: COLORS.textDim, fontStyle: "italic" }}>
                      <span style={{ color: COLORS.brass, fontStyle: "normal", fontWeight: 600, marginRight: 6 }}>Notes:</span>
                      "{client.ghost_notes}"
                    </div>
                  )}
                </div>
              );
            })}
          {showCreds &&
            credentials.map((cred) => {
              const days = getDaysRemaining(cred.deletedAt);
              return (
                <div key={"c-" + cred.id} style={S.trashCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...S.dialRing, width: 36, height: 36 }}>
                      <KeyRound size={17} color="#B08D57" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{cred.label}</span>
                        <span style={S.trashBadge}>Auto-purges in {days}d</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: COLORS.textDim, marginTop: 3, fontFamily: "IBM Plex Mono, monospace" }}>
                        <span style={{ color: COLORS.brass }}>{cred.clientName || "Client"}</span>
                        <span style={{ color: COLORS.textFaint }}>&gt;</span>
                        <span style={{ color: COLORS.text }}>{cred.projectName || "Project"}</span>
                        <span style={{ color: COLORS.textFaint }}>&gt;</span>
                        <span style={{ color: "#8FA98C", fontWeight: 600 }}>{cred.label}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={S.restoreBtn} onClick={() => onRestoreCred(cred)}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      style={S.dangerBtn}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Delete Secret Forever",
                          message: `Are you sure you want to permanently delete "${cred.label}" forever? This action cannot be reversed.`,
                          onConfirm: () => onPermanentDelete("credential", cred.id, cred.label),
                        });
                      }}
                    >
                      <Trash2 size={12} /> Delete Forever
                    </button>
                  </div>
                </div>
              );
            })}

          {showProjects &&
            projects.map((proj) => {
              const days = getDaysRemaining(proj.deletedAt);
              return (
                <div key={"p-" + proj.id} style={S.trashCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...S.dialRing, width: 36, height: 36 }}>
                      <Folder size={17} color="#8FA98C" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{proj.name}</span>
                        <span style={S.trashBadge}>Auto-purges in {days}d</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: COLORS.textDim, marginTop: 3, fontFamily: "IBM Plex Mono, monospace" }}>
                        <span style={{ color: COLORS.brass }}>{proj.clientName || "Client"}</span>
                        <span style={{ color: COLORS.textFaint }}>&gt;</span>
                        <span style={{ color: COLORS.text, fontWeight: 600 }}>{proj.name}</span>
                        <span style={{ color: COLORS.textFaint }}>({proj.credentials?.length || 0} secrets)</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={S.restoreBtn} onClick={() => onRestoreProject(proj)}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      style={S.dangerBtn}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Delete Project Forever",
                          message: `Are you sure you want to permanently delete project "${proj.name}" and all its credentials?`,
                          onConfirm: () => onPermanentDelete("project", proj.id, proj.name),
                        });
                      }}
                    >
                      <Trash2 size={12} /> Delete Forever
                    </button>
                  </div>
                </div>
              );
            })}

          {showClients &&
            clients.map((client) => {
              const days = getDaysRemaining(client.deletedAt);
              return (
                <div key={"cl-" + client.id} style={S.trashCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...S.dialRing, width: 36, height: 36 }}>
                      <Building2 size={17} color="#B08D57" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{client.name}</span>
                        <span style={S.trashBadge}>Auto-purges in {days}d</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                        Client (includes all projects and secrets)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={S.restoreBtn} onClick={() => onRestoreClient(client)}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      style={S.dangerBtn}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Delete Client Forever",
                          message: `Are you sure you want to permanently delete client "${client.name}" and all associated projects and secrets?`,
                          onConfirm: () => onPermanentDelete("client", client.id, client.name),
                        });
                      }}
                    >
                      <Trash2 size={12} /> Delete Forever
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete Forever"
        isDanger={true}
      />
    </div>
  );
}
