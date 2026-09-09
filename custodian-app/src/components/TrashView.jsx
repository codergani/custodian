import React, { useState } from "react";
import { Trash2, KeyRound, Folder, Building2, RotateCcw } from "lucide-react";
import { S, COLORS } from "../styles";
import { ConfirmModal } from "./shared";

export default function TrashView({
  trashedItems = {},
  onRestoreCred,
  onRestoreProject,
  onRestoreClient,
  onPermanentDelete,
  onEmptyTrash
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
  const totalCount = credentials.length + projects.length + clients.length;

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
        {totalCount > 0 && (
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

      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 10 }}>
        {[
          { id: "all", label: `All (${totalCount})` },
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

      {totalCount === 0 ? (
        <div style={S.welcomeState}>
          <Trash2 size={36} color="#3A3835" />
          <div style={S.welcomeTitle}>Trash is empty</div>
          <div style={S.welcomeSub}>
            When you delete a secret, project, or client, you'll have 30 days to restore it from here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
