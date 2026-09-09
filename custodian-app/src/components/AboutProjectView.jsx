import React, { useState, useEffect } from "react";
import {
  Calendar, CheckSquare, Square, Pin, FileText, Lock, Plus, Upload, Link2, ExternalLink,
  Trash2, Eye, ShieldCheck, Check, Edit3, X, File, FileCheck, CheckCircle, Paperclip
} from "lucide-react";
import { S, COLORS } from "../styles";
import { Overlay } from "./shared";
import DocAnnotationViewerModal from "./DocAnnotationViewer";
import { registerBackButtonHandler } from "../native/nativeBridge";

export default function AboutProjectView({ project, activeTab = "timeline", onUpdateDetails, onOpenEdit }) {
  const details = project.details || {};
  const [newChecklistText, setNewChecklistText] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  function handleSaveLink(e) {
    e?.preventDefault();
    if (!linkUrl.trim()) return;
    const finalTitle = linkTitle.trim() || linkUrl.trim();
    handleAddAttachmentLink(finalTitle, linkUrl.trim());
    setLinkTitle("");
    setLinkUrl("");
    setShowAddLinkModal(false);
  }

  // Close doc preview on Android hardware back button
  useEffect(() => {
    if (!previewDoc) return;
    return registerBackButtonHandler(() => {
      setPreviewDoc(null);
      setIsTheater(false);
      return true;
    }, 20);
  }, [previewDoc]);

  const lastDate = details.lastDate || "";
  const lastPartialDate = details.lastPartialDate || "";
  const checklist = details.checklist || [];
  const notes = details.notes || "";
  const attachments = details.attachments || [];

  // 1. Calculate Delivery Days & Buffer
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  function sanitizeDate(dStr) {
    if (!dStr || typeof dStr !== "string") return null;
    const parts = dStr.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || year < 2000 || year > 2099 || isNaN(month) || month < 0 || month > 11 || isNaN(day) || day < 1 || day > 31) return null;
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const validLD = sanitizeDate(lastDate);
  const validLPD = sanitizeDate(lastPartialDate);

  let daysToLastDate = validLD ? Math.round((validLD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  let daysToLPD = validLPD ? Math.round((validLPD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  let greyDays = validLD && validLPD ? Math.round((validLD.getTime() - validLPD.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Checklist calculations
  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercent = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;

  function toggleChecklistItem(id) {
    const updated = checklist.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
    onUpdateDetails({ ...details, checklist: updated });
  }

  function handleAddChecklistItem(e) {
    e?.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: Date.now(),
      text: newChecklistText.trim(),
      completed: false,
    };
    onUpdateDetails({ ...details, checklist: [...checklist, newItem] });
    setNewChecklistText("");
  }

  function removeChecklistItem(id) {
    const updated = checklist.filter((item) => item.id !== id);
    onUpdateDetails({ ...details, checklist: updated });
  }

  function handleAddAttachmentLink(title, url) {
    if (!url.trim()) return;
    const item = {
      id: Date.now(),
      type: "link",
      name: title.trim() || url.trim(),
      url: url.trim(),
    };
    onUpdateDetails({ ...details, attachments: [...attachments, item] });
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const item = {
        id: Date.now(),
        type: "file",
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        dataUrl: evt.target.result,
      };
      onUpdateDetails({ ...details, attachments: [...attachments, item] });
    };
    reader.readAsDataURL(file);
  }

  function removeAttachment(id) {
    onUpdateDetails({ ...details, attachments: attachments.filter((a) => a.id !== id) });
  }

  const hasDeadlines = !!(lastDate || lastPartialDate);

  // 1. DELIVERY TIMELINE TAB
  if (activeTab === "timeline") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...S.watchdogStatCard, padding: "20px 22px", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...S.dialRing, width: 38, height: 38 }}>
                <Calendar size={18} color={COLORS.brass} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>Delivery Timeline & Safety Buffer</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                  Set your internal finish target and client contract deadline to calculate your QA buffer.
                </div>
              </div>
            </div>
            <button style={S.secondaryBtn} onClick={onOpenEdit}>
              <Edit3 size={13} /> {hasDeadlines ? "Edit Timeline" : "Set Deadlines"}
            </button>
          </div>

          {hasDeadlines ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 4 }}>
              <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: COLORS.textFaint, textTransform: "uppercase", fontWeight: 600 }}>Target Finish Goal</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.brass, marginTop: 4 }}>
                  {lastPartialDate ? new Date(lastPartialDate).toLocaleDateString() : "Not Set"}
                </div>
                <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 4 }}>
                  {daysToLPD !== null ? (daysToLPD <= 0 ? "🔴 Due Today!" : `🎯 ${daysToLPD} days remaining`) : "Internal finish target"}
                </div>
              </div>

              <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: COLORS.textFaint, textTransform: "uppercase", fontWeight: 600 }}>Client Contract Deadline</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>
                  {lastDate ? new Date(lastDate).toLocaleDateString() : "Not Set"}
                </div>
                <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 4 }}>
                  {daysToLastDate !== null ? (daysToLastDate <= 0 ? "🔴 Due Today!" : `⏳ ${daysToLastDate} days remaining`) : "Official contract date"}
                </div>
              </div>

              {greyDays !== null && (
                <div style={{ background: "rgba(45, 106, 66, 0.08)", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, color: COLORS.green, textTransform: "uppercase", fontWeight: 600 }}>Delivery Safety Buffer</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.green, marginTop: 4 }}>
                    🛡️ {greyDays} Day{greyDays !== 1 ? "s" : ""} Buffer
                  </div>
                  <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4 }}>
                    Extra buffer days reserved for QA & client testing
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: COLORS.textDim, background: COLORS.panelAlt, padding: "16px 18px", borderRadius: 10, border: `1px solid ${COLORS.line}`, lineHeight: 1.5 }}>
              No contract deadlines set yet. Click <strong>"Set Deadlines"</strong> above to schedule your target delivery date and official client submission deadline.
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. DELIVERABLES CHECKLIST TAB
  if (activeTab === "checklist") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...S.watchdogStatCard, padding: "20px 22px", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...S.dialRing, width: 38, height: 38 }}>
                <CheckSquare size={18} color={COLORS.green} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>Deliverables & Milestone Checklist</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                  Track client deliverables and verify milestone completion before handoff.
                </div>
              </div>
            </div>
            <span style={{ ...S.savingsBadge, fontSize: 12, padding: "6px 12px" }}>
              {completedCount} / {checklist.length} Completed ({progressPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          {checklist.length > 0 && (
            <div style={{ ...S.progressBarBg, height: 6, borderRadius: 3 }}>
              <div style={{ ...S.progressBarFill, width: `${progressPercent}%`, height: "100%" }} />
            </div>
          )}

          {/* Checklist Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {checklist.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  background: item.completed ? "rgba(45,106,66,0.06)" : COLORS.panelAlt,
                  border: `1px solid ${item.completed ? "rgba(45,106,66,0.25)" : COLORS.line}`,
                  borderRadius: 8,
                  gap: 10,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  {item.completed ? <CheckSquare size={16} color={COLORS.green} /> : <Square size={16} color={COLORS.textFaint} />}
                  <span
                    style={{
                      fontSize: 13,
                      color: item.completed ? COLORS.textDim : COLORS.text,
                      textDecoration: item.completed ? "line-through" : "none",
                    }}
                  >
                    {item.text}
                  </span>
                </div>
                <button
                  type="button"
                  style={S.iconBtnGhost}
                  onClick={() => removeChecklistItem(item.id)}
                  title="Remove deliverable"
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {checklist.length === 0 && (
              <div style={{ fontSize: 12.5, color: COLORS.textFaint, background: COLORS.panelAlt, padding: "14px 16px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
                No deliverable tasks added yet. Type a milestone below and click "+ Add Task".
              </div>
            )}
          </div>

          {/* Add Item Form */}
          <form onSubmit={handleAddChecklistItem} style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <input
              style={{ ...S.input, padding: "8px 12px", fontSize: 12.5, flex: "1 1 200px" }}
              placeholder="Add new deliverable (e.g. Stripe webhook integration, Deploy to Vercel, QA testing)..."
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
            />
            <button type="submit" style={{ ...S.primaryBtnSm, padding: "8px 16px", fontSize: 12.5, flexShrink: 0 }} disabled={!newChecklistText.trim()}>
              <Plus size={13} /> Add Task
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. PINNED PRDS & DOCS TAB
  if (activeTab === "docs") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...S.watchdogStatCard, padding: "20px 22px", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...S.dialRing, width: 38, height: 38 }}>
                <Pin size={18} color="#B08D57" />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>Pinned PRDs, SOPs & Client Documents</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                  Click any document below to view and read it inside Custodian.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ ...S.secondaryBtn, cursor: "pointer", fontSize: 12, padding: "6px 12px" }}>
                <Paperclip size={13} color="#B08D57" /> Pin PDF / File
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.md" style={{ display: "none" }} onChange={handleFileUpload} />
              </label>
              <button
                type="button"
                style={{ ...S.secondaryBtn, fontSize: 12, padding: "6px 12px" }}
                onClick={() => {
                  setLinkTitle("");
                  setLinkUrl("");
                  setShowAddLinkModal(true);
                }}
              >
                <Link2 size={13} color="#8FA98C" /> Pin Web Link
              </button>
            </div>
          </div>

          {/* Pinned Items Grid */}
          {attachments.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, marginTop: 4 }}>
              {attachments.map((att) => (
                <div
                  key={att.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: COLORS.panelAlt,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12.5,
                    gap: 8,
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                  onClick={() => setPreviewDoc(att)}
                  title={`Click to view ${att.name}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {att.type === "file" ? <FileText size={16} color="#B08D57" style={{ flexShrink: 0 }} /> : <Link2 size={16} color="#8FA98C" style={{ flexShrink: 0 }} />}
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ color: COLORS.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {att.name}
                      </span>
                      <span style={{ fontSize: 10.5, color: COLORS.textFaint }}>
                        {att.type === "file" ? `${att.size || ""} • Click to View` : "Web Spec Link"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      style={{ ...S.iconBtnGhost, color: COLORS.brass }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDoc(att);
                      }}
                      title="View in app"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      type="button"
                      style={S.iconBtnGhost}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(att.id);
                      }}
                      title="Unpin document"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: COLORS.textFaint, background: COLORS.panelAlt, padding: "16px 18px", borderRadius: 10, border: `1px solid ${COLORS.line}`, lineHeight: 1.5 }}>
              No documents pinned yet. Click <strong>"Pin PDF / File"</strong> to upload client PRDs or <strong>"Pin Web Link"</strong> to attach Figma boards and Notion SOPs.
            </div>
          )}
        </div>

        {/* IN-APP PIN WEB LINK MODAL */}
        {showAddLinkModal && (
          <Overlay
            onClose={() => setShowAddLinkModal(false)}
            title="Pin Web Link / Spec Document"
            icon={<Link2 size={18} color="#8FA98C" />}
            cardStyle={{ ...S.modalCard, maxWidth: 460 }}
          >
            <form onSubmit={handleSaveLink} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={S.label}>Document Title</label>
                <input
                  style={S.input}
                  placeholder="e.g. Figma Design Specs, Notion PRD, API Docs"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={S.label}>Document or Resource URL</label>
                <input
                  style={S.input}
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                <button type="button" style={S.secondaryBtn} onClick={() => setShowAddLinkModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={S.primaryBtn} disabled={!linkUrl.trim()}>
                  Pin Document
                </button>
              </div>
            </form>
          </Overlay>
        )}

        {/* IMMERSIVE IN-APP DOCUMENT VIEWER WITH FLOATING ANNOTATION & MARKUP CONTROLS */}
        {previewDoc && (
          <DocAnnotationViewerModal
            previewDoc={previewDoc}
            details={details}
            onUpdateDetails={onUpdateDetails}
            isTheater={isTheater}
            setIsTheater={setIsTheater}
            onClose={() => {
              setPreviewDoc(null);
              setIsTheater(false);
            }}
          />
        )}
      </div>
    );
  }

  // 4. SPECS & SCOPE NOTES TAB
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...S.watchdogStatCard, padding: "20px 22px", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...S.dialRing, width: 38, height: 38 }}>
              <FileText size={18} color="#B08D57" />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>Client Specs, Scope & Staging Notes</div>
              <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                Keep staging URLs, server guidelines, and client scope requirements organized in one place.
              </div>
            </div>
          </div>
          <button style={S.secondaryBtn} onClick={onOpenEdit}>
            <Edit3 size={13} /> Edit Specs
          </button>
        </div>

        <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "16px 18px", fontSize: 13, color: notes ? COLORS.text : COLORS.textFaint, lineHeight: 1.6, minHeight: 120, whiteSpace: "pre-wrap" }}>
          {notes || "No project specs or requirement notes written yet. Click 'Edit Specs' above to record staging URLs, deployment instructions, or client specifications."}
        </div>
      </div>
    </div>
  );
}
