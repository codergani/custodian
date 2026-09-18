import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, Upload, Download, Copy, Check, Edit3, Trash2,
  FileText, Image, File, Package, Compass, Link2, Eye,
  AlertTriangle, CheckCircle, ChevronDown, Sparkles, BookOpen,
  Lightbulb, GitBranch, StickyNote, Play,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { S, COLORS } from "./styles";
import { CustomDropdown } from "./components/shared";

// ──── Constants ────
const TYPE_META = {
  template: { label: "Template", icon: BookOpen, color: "#B08D57", bg: "rgba(176,141,87,0.15)" },
  guideline: { label: "Guideline", icon: Lightbulb, color: "#8FA98C", bg: "rgba(143,169,140,0.15)" },
  workflow: { label: "Workflow", icon: GitBranch, color: "#C49B66", bg: "rgba(196,155,102,0.15)" },
  note: { label: "Note", icon: StickyNote, color: "#A8A399", bg: "rgba(168,163,153,0.15)" },
};

const STARTER_ITEMS = [
  {
    type: "template",
    title: "Client Onboarding Checklist",
    tags: ["onboarding", "checklist", "starter"],
    text_content: `# Client Onboarding Checklist

Use this checklist to collect all necessary assets, credentials, and requirements before starting development.

## 1. Company & Project Context
- [ ] Project brief & key business goals defined
- [ ] Primary stakeholder & decision-maker contacts
- [ ] Target completion date & agreed contract delivery deadline
- [ ] Billing contact & invoicing schedule (deposit / milestones)

## 2. Brand & Design Assets
- [ ] Vector logos (SVG, AI, PNG) and brand style guide
- [ ] Color palette (Primary, Secondary, Accent, Dark/Light modes)
- [ ] Typography & web font licenses
- [ ] Figma / design wireframes sign-off

## 3. Technical Credentials & Access
- [ ] Cloud & hosting invites (Vercel, AWS, Cloudflare, Supabase)
- [ ] Database connection strings & root admin access
- [ ] Third-party API keys (Stripe, OpenAI, SendGrid, Twilio)
- [ ] GitHub / GitLab repository collaborator access
- [ ] Domain DNS management access

## 4. Communication & Delivery Rules
- [ ] Primary communication channel agreed (Slack, Email, Discord)
- [ ] Weekly async check-in schedule established
- [ ] Scope change policy shared with client`,
  },
  {
    type: "template",
    title: "Project Handover Document Structure",
    tags: ["handover", "deliverables", "starter"],
    text_content: `# Project Handover Document

## Project: [Project / Application Name]
## Client: [Client Company Name]
## Delivery Date: [YYYY-MM-DD]

---

### 1. Executive Summary & Deliverables
- **Live Production URL:** [https://example.com]
- **Staging / Preview URL:** [https://staging.example.com]
- **Source Code Repository:** [https://github.com/organization/repo]
- **Main Features Completed:** [Feature A, Feature B, Feature C]

---

### 2. Architecture & Tech Stack
- **Frontend:** React / Next.js / Tailwind CSS / Vanilla CSS
- **Backend & Database:** Node.js, Supabase / PostgreSQL
- **Hosting & Infrastructure:** Vercel / Cloudflare DNS / AWS S3

---

### 3. Access Credentials & Account Ownership
- **DNS / Domains:** Pointed to production records; client holds root registrar.
- **Environment Variables:** Transferred securely via Custodian 1-Click Handover Package.
- **Third-Party Services:** Billing and admin roles transferred to client email.

---

### 4. Warranty & Ongoing Support Terms
- **Bug Fix Warranty:** 30 days from delivery for bugs within approved scope.
- **Maintenance / Retainer:** Additional feature requests or maintenance billed at agreed hourly/monthly retainer.
- **Emergency Contact:** [your-email@domain.com]`,
  },
  {
    type: "guideline",
    title: "Client Communication Guidelines",
    tags: ["client-relations", "communication", "starter"],
    text_content: `# Client Communication Guidelines

Setting crystal-clear boundaries and expectations prevents burnout and ensures smooth client relationships.

## 1. Working Hours & Response Times
- **Standard Hours:** Monday – Friday, 9:00 AM – 6:00 PM (Local Time).
- **Email & Slack Response:** Within 24 business hours (urgent outages prioritized within 4 hours).
- **Weekends:** Emergency server downtime only; all feature requests addressed on Monday.

## 2. Async Updates vs. Calls
- **Weekly Progress Recap:** Written summary every Friday covering completed milestones, current blockers, and next week's focus.
- **Live Calls:** Reserved for milestone sign-offs or complex technical demos (scheduled 24h in advance).

## 3. Revision Policy & Scope Changes
- **Included Revisions:** Up to 2 rounds of design & implementation tweaks within the original agreed scope.
- **Scope Creep Rule:** Any new features requested outside the initial spec require a written change order with estimated timeline & budget adjustments before work begins.`,
  },
  {
    type: "workflow",
    title: "New Project Kickoff Workflow",
    tags: ["workflow", "kickoff", "starter"],
    text_content: `# New Project Kickoff Workflow

Follow this 5-step workflow to transition from initial inquiry to active development without missed requirements.

\`\`\`
[1. Discovery] ──> [2. Scoping & Spec] ──> [3. Vault & Buffer Setup] ──> [4. Staging Init] ──> [5. Kickoff Call]
\`\`\`

### Step 1: Requirements Discovery & Feasibility
1. Conduct discovery call to determine user personas, required integrations, and MVP boundaries.
2. Identify external dependencies (e.g. third-party APIs with approval delays).

### Step 2: Scoping & Milestone Timeline
1. Break down deliverables into 2-week sprint milestones.
2. Send formal proposal with payment schedule (deposit required before kickoff).

### Step 3: Custodian Workspace & Safety Buffer Setup
1. Create dedicated Client Workspace in Custodian.
2. Input official Client Contract Deadline and set internal Target Finish Goal (3–7 day Delivery Safety Buffer).
3. Record API keys and environment variables in the encrypted vault.

### Step 4: Staging Environment & Skeleton Export
1. Spin up staging environment with automated CI/CD branch previews.
2. Export Safe .env Skeleton to verify contractor setups without leaking live keys.

### Step 5: Official Kickoff Call
1. Review roadmap with client stakeholder and confirm milestone sign-off dates.`,
  },
  {
    type: "template",
    title: "Invoice Follow-Up Template",
    tags: ["invoicing", "finance", "starter"],
    text_content: `# Invoice Follow-Up Messages

Polite, professional, and firm templates for following up on outstanding project invoices.

---

### Template 1: Upcoming Due Date (3 Days Before)
**Subject:** Friendly Reminder: Invoice #[INV-001] due on [Due Date]

Hi [Client Name],

Hope you're having a great week!

This is a quick friendly reminder that Invoice #[INV-001] for **[Project Name - Milestone X]** ($[Amount]) is due on **[Due Date]**.

You can review and pay the invoice here: [Payment Link]

Let me know if you need any additional tax details or receipts.

Best regards,  
[Your Name]

---

### Template 2: Due Today
**Subject:** Invoice #[INV-001] is due today – [Project Name]

Hi [Client Name],

Just checking in to let you know that Invoice #[INV-001] for $[Amount] is due today.

Payment link: [Payment Link]

Please let me know once payment has been processed so I can update our project ledger and release the next milestone deliverables.

Thanks,  
[Your Name]

---

### Template 3: 7 Days Overdue (Firm)
**Subject:** Follow-up: Overdue Invoice #[INV-001] – Action Required

Hi [Client Name],

I noticed that Invoice #[INV-001] ($[Amount]) for [Project Name] is now 7 days past due (original due date: [Due Date]).

Could you please confirm when payment will be issued? Per our agreement, active development and staging deployments are paused on overdue accounts until outstanding balances are cleared.

Payment link: [Payment Link]

Thank you for your prompt attention to this.

Best regards,  
[Your Name]`,
  },
];

const QUOTA_BYTES = {
  free: 268435456,      // 256 MB
  pro: 5368709120,      // 5 GB
  team: 53687091200,    // 50 GB
  founder: 53687091200, // 50 GB
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(i < 2 ? 0 : 1)) + " " + sizes[i];
}

function isImageMime(mime, filePath = "") {
  if (mime && mime.startsWith("image/")) return true;
  const ext = (filePath || "").split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext);
}

function isVideoMime(mime, filePath = "") {
  if (mime && mime.startsWith("video/")) return true;
  const ext = (filePath || "").split(".").pop().toLowerCase();
  return ["mp4", "webm", "mov", "m4v", "mkv", "ogv"].includes(ext);
}

function isAudioMime(mime, filePath = "") {
  if (mime && mime.startsWith("audio/")) return true;
  const ext = (filePath || "").split(".").pop().toLowerCase();
  return ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext);
}

// ──── Main WorkspaceView ────
export default function WorkspaceView({ userId, profile, clients, showSuccess, onOpenUpgrade }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | template | guideline | workflow | note
  const [linkFilter, setLinkFilter] = useState("all"); // all | general | client-{id}
  const [modal, setModal] = useState(null); // null | { type: "add" } | { type: "preview", item } | { type: "edit", item } | { type: "delete", item } | { type: "link", item }
  const [hoveredCard, setHoveredCard] = useState(null);
  const [injectingStarters, setInjectingStarters] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const plan = profile?.plan || "free";
  const storageUsed = profile?.storage_used_bytes || 0;
  const storageQuota = QUOTA_BYTES[plan] || QUOTA_BYTES.free;
  const storagePercent = Math.min(100, (storageUsed / storageQuota) * 100);
  const storageMeterColor = storagePercent > 85 ? "#E07A6D" : storagePercent > 60 ? "#E0B77D" : "#8FA98C";

  // Helper to ensure authenticated user ID matches Supabase RLS policy
  const getActiveUserId = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) return authData.user.id;
    } catch {}
    return userId;
  }, [userId]);

  // ──── Load items with Auto-Seed for New Accounts ────
  const loadItems = useCallback(async () => {
    setLoadErr("");
    try {
      const activeUid = await getActiveUserId();
      if (!activeUid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("workspace_items")
        .select("*")
        .eq("user_id", activeUid)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Auto-seed starter templates ONLY for first-time new accounts (0 items and never seeded before)
      const seedKey = `custodian_starter_seeded_${activeUid}`;
      const hasSeeded = localStorage.getItem(seedKey);

      if ((!data || data.length === 0) && !hasSeeded) {
        localStorage.setItem(seedKey, "true");
        try {
          const rows = STARTER_ITEMS.map((s) => ({
            user_id: activeUid,
            client_id: null,
            project_id: null,
            type: s.type,
            title: s.title,
            tags: s.tags,
            text_content: s.text_content,
            file_path: null,
            file_size_bytes: 0,
            mime_type: null,
          }));
          const { data: inserted, error: seedErr } = await supabase
            .from("workspace_items")
            .insert(rows)
            .select();
          if (!seedErr && inserted && inserted.length > 0) {
            setItems(inserted);
            return;
          }
        } catch (seedE) {
          console.warn("Auto-seeding starter templates fallback:", seedE);
        }
      } else if (data && data.length > 0 && !hasSeeded) {
        // Existing user with data — record flag so we never retroactively inject
        localStorage.setItem(seedKey, "true");
      }

      setItems(data || []);
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [getActiveUserId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // ──── Inject Starter SOPs & Templates (Manual Trigger) ────
  async function handleInjectStarters() {
    setInjectingStarters(true);
    setLoadErr("");
    try {
      const activeUid = await getActiveUserId();
      if (!activeUid) throw new Error("Please log in to add templates.");

      const rows = STARTER_ITEMS.map((s) => ({
        user_id: activeUid,
        client_id: null,
        project_id: null,
        type: s.type,
        title: s.title,
        tags: s.tags,
        text_content: s.text_content,
        file_path: null,
        file_size_bytes: 0,
        mime_type: null,
      }));
      const { error } = await supabase.from("workspace_items").insert(rows);
      if (error) throw error;
      showSuccess("Added 5 starter templates & SOPs to Resource Library!");
      loadItems();
    } catch (e) {
      setLoadErr("Could not load starters: " + e.message);
    } finally {
      setInjectingStarters(false);
    }
  }

  // ──── CRUD: Add Item ────
  async function addItem({ title, type, tags, textContent, file, clientId, projectId }) {
    let filePath = null;
    let fileSize = 0;
    let mimeType = null;
    const activeUid = await getActiveUserId();
    if (!activeUid) throw new Error("No active user session.");

    if (file) {
      // Client-side quota check
      if (storageUsed + file.size > storageQuota) {
        throw new Error(`Storage quota exceeded. This file (${formatBytes(file.size)}) would push you over your ${plan} plan limit of ${formatBytes(storageQuota)}.`);
      }
      const ext = file.name.split(".").pop();
      const uniqueName = `${activeUid}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("workspace-files")
        .upload(uniqueName, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;
      filePath = uniqueName;
      fileSize = file.size;
      mimeType = file.type;
    }

    const { error } = await supabase.from("workspace_items").insert({
      user_id: activeUid,
      client_id: clientId || null,
      project_id: projectId || null,
      type,
      title,
      tags: tags.filter(Boolean),
      text_content: textContent || null,
      file_path: filePath,
      file_size_bytes: fileSize,
      mime_type: mimeType,
    });
    if (error) throw error;
    showSuccess(`Saved "${title}" to Resource Library`);
    setModal(null);
    loadItems();
    // Refresh profile to get updated storage_used_bytes
    refreshStorage();
  }

  // ──── CRUD: Update Item ────
  async function updateItem(id, updates) {
    const { error } = await supabase.from("workspace_items").update(updates).eq("id", id);
    if (error) throw error;
    showSuccess(`Updated "${updates.title || "item"}"`);
    setModal(null);
    loadItems();
  }

  // ──── CRUD: Delete Item ────
  async function deleteItem(item) {
    // Delete file from storage if it exists
    if (item.file_path) {
      await supabase.storage.from("workspace-files").remove([item.file_path]);
    }
    const { error } = await supabase.from("workspace_items").delete().eq("id", item.id);
    if (error) throw error;
    showSuccess(`Deleted "${item.title}"`);
    setModal(null);
    loadItems();
    refreshStorage();
  }

  // Refresh storage usage from profiles
  async function refreshStorage() {
    const { data } = await supabase.from("profiles").select("storage_used_bytes").eq("id", userId).single();
    if (data && profile) {
      profile.storage_used_bytes = data.storage_used_bytes;
    }
  }

  // ──── Get file URL ────
  function getFileUrl(filePath) {
    const { data } = supabase.storage.from("workspace-files").getPublicUrl(filePath);
    return data?.publicUrl || "";
  }

  function getSignedUrl(filePath) {
    return supabase.storage.from("workspace-files").createSignedUrl(filePath, 3600);
  }

  // ──── Filter logic ────
  const filtered = items.filter((item) => {
    // Type filter
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    // Link filter
    if (linkFilter === "general" && (item.client_id || item.project_id)) return false;
    if (linkFilter.startsWith("client-")) {
      const cId = linkFilter.replace("client-", "");
      if (item.client_id !== cId) return false;
    }
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTags) return false;
    }
    return true;
  });

  // ──── Render ────
  return (
    <div>
      {/* Header */}
      <div style={S.mainHeadRow}>
        <div>
          <div style={{ ...S.eyebrow, color: COLORS.brass }}>SHARED SOPs & ASSETS</div>
          <h1 style={S.mainTitle}>Resource Library</h1>
          <div style={{ fontSize: 12.5, color: COLORS.textDim, marginTop: 2 }}>
            Centralized repository for developer templates, client onboarding SOPs, staging checklists, and brand assets.
          </div>
        </div>
        <div style={S.headActions}>
          {items.length === 0 && (
            <button
              style={{ ...S.secondaryBtn, color: COLORS.brass, borderColor: COLORS.brassDim }}
              onClick={handleInjectStarters}
              disabled={injectingStarters}
            >
              <Sparkles size={14} color={COLORS.brass} /> {injectingStarters ? "Loading Starters…" : "Load Starter SOPs"}
            </button>
          )}
          <button style={S.primaryBtnSm} onClick={() => setModal({ type: "add" })}>
            <Plus size={14} /> Add Resource
          </button>
        </div>
      </div>

      {/* Resource Library Guide Info Banner */}
      {showGuide && (
        <div
          style={{
            background: "var(--panel-main, #FFFFFF)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${COLORS.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <BookOpen size={16} color={COLORS.brass} />
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
                How to Organize Your Resource Library
              </span>
              <span style={{ fontSize: 11, color: COLORS.textDim }}>
                — Save company-wide docs or link items to specific clients
              </span>
            </div>
            <button
              type="button"
              style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", padding: 4, borderRadius: 4 }}
              onClick={() => setShowGuide(false)}
              title="Dismiss Guide"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <BookOpen size={14} color="#B08D57" />
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Templates</span>
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textDim, lineHeight: 1.45 }}>
                Checklists, contracts, milestone specs, and .env boilerplates.
              </div>
            </div>

            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Lightbulb size={14} color="#8FA98C" />
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Guidelines</span>
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textDim, lineHeight: 1.45 }}>
                Security rules, communication protocols, and API policies.
              </div>
            </div>

            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <GitBranch size={14} color="#C49B66" />
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Workflows</span>
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textDim, lineHeight: 1.45 }}>
                Production rollout steps, QA passes, and kickoff pipelines.
              </div>
            </div>

            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <StickyNote size={14} color="#A8A399" />
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Shared Notes & Media</span>
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textDim, lineHeight: 1.45 }}>
                Brand videos, architecture diagrams, and client deliverables notes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar: Search + Storage Meter */}
      <div style={S.workspaceTopBar}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} color={COLORS.textFaint} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            style={S.workspaceSearchInput}
            placeholder="Search by title or tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", padding: 2 }}
              onClick={() => setSearchQuery("")}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Storage Meter */}
        <div style={S.storageMeter}>
          <div style={S.storageMeterBarBg}>
            <div
              style={{
                ...S.storageMeterBarFill,
                width: `${storagePercent}%`,
                background: storageMeterColor,
              }}
            />
          </div>
          <span style={{ ...S.storageMeterText, color: storageMeterColor }}>
            {formatBytes(storageUsed)} / {formatBytes(storageQuota)}
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div style={S.workspaceFilterRow} className="custodian-hscroll">
        {/* Type filters */}
        {[{ id: "all", label: "All" }, ...Object.entries(TYPE_META).map(([id, m]) => ({ id, label: m.label }))].map((f) => (
          <button
            key={f.id}
            style={{ ...S.workspaceFilterChip, ...(typeFilter === f.id ? S.workspaceFilterChipActive : {}) }}
            onClick={() => setTypeFilter(f.id)}
          >
            {f.label}
          </button>
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: COLORS.line, margin: "0 4px" }} />

        {/* Link filters */}
        <button
          style={{ ...S.workspaceFilterChip, ...(linkFilter === "all" ? S.workspaceFilterChipActive : {}) }}
          onClick={() => setLinkFilter("all")}
        >
          All Links
        </button>
        <button
          style={{ ...S.workspaceFilterChip, ...(linkFilter === "general" ? S.workspaceFilterChipActive : {}) }}
          onClick={() => setLinkFilter("general")}
        >
          General
        </button>
        {(clients || []).map((c) => (
          <button
            key={c.id}
            style={{ ...S.workspaceFilterChip, ...(linkFilter === `client-${c.id}` ? S.workspaceFilterChipActive : {}) }}
            onClick={() => setLinkFilter(`client-${c.id}`)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && <div style={S.emptyState}>Loading resource library…</div>}
      {loadErr && (
        <div style={{ ...S.errBox, marginBottom: 14 }}>
          <AlertTriangle size={14} /> {loadErr}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div style={S.welcomeState}>
          <Package size={42} color={COLORS.brassDim} />
          <div style={S.welcomeTitle}>Your Resource Library is empty</div>
          <div style={S.welcomeSub}>
            Save reusable onboarding SOPs, deployment checklists, and developer guidelines here. Link them to specific clients or keep them general for company-wide reuse.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              style={{ ...S.secondaryBtn, color: COLORS.brass, borderColor: COLORS.brassDim }}
              onClick={handleInjectStarters}
              disabled={injectingStarters}
            >
              <Sparkles size={14} color={COLORS.brass} /> {injectingStarters ? "Adding Starters…" : "✨ Load 5 Starter Templates & SOPs"}
            </button>
            <button style={S.primaryBtnSm} onClick={() => setModal({ type: "add" })}>
              <Plus size={14} /> Create Custom Item
            </button>
          </div>
        </div>
      )}

      {/* Filtered empty */}
      {!loading && items.length > 0 && filtered.length === 0 && (
        <div style={S.emptyState}>No items match your current filters.</div>
      )}

      {/* Card Grid */}
      {!loading && filtered.length > 0 && (
        <div style={S.workspaceGrid}>
          {filtered.map((item) => (
            <WorkspaceCard
              key={item.id}
              item={item}
              clients={clients}
              hovered={hoveredCard === item.id}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onPreview={() => setModal({ type: "preview", item })}
              onEdit={() => setModal({ type: "edit", item })}
              onDelete={() => setModal({ type: "delete", item })}
              onLink={() => setModal({ type: "link", item })}
              onCopy={() => {
                if (item.text_content) {
                  navigator.clipboard.writeText(item.text_content).catch(() => {});
                  showSuccess(`Copied "${item.title}" to clipboard`);
                }
              }}
              onDownload={async () => {
                if (item.file_path) {
                  const { data, error } = await getSignedUrl(item.file_path);
                  if (!error && data?.signedUrl) {
                    const a = document.createElement("a");
                    a.href = data.signedUrl;
                    a.download = item.title || "download";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    showSuccess(`Downloaded "${item.title}"`);
                  }
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal?.type === "add" && (
        <AddWorkspaceItemModal
          clients={clients}
          plan={plan}
          storageUsed={storageUsed}
          storageQuota={storageQuota}
          onClose={() => setModal(null)}
          onSave={addItem}
        />
      )}
      {modal?.type === "edit" && (
        <EditWorkspaceItemModal
          item={modal.item}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={(updates) => updateItem(modal.item.id, updates)}
        />
      )}
      {modal?.type === "preview" && (
        <PreviewWorkspaceItemModal
          item={modal.item}
          clients={clients}
          getSignedUrl={getSignedUrl}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", item: modal.item })}
          onDelete={() => setModal({ type: "delete", item: modal.item })}
          onCopy={() => {
            if (modal.item.text_content) {
              navigator.clipboard.writeText(modal.item.text_content).catch(() => {});
              showSuccess(`Copied "${modal.item.title}" to clipboard`);
            }
          }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteConfirmModal
          item={modal.item}
          onClose={() => setModal(null)}
          onConfirm={() => deleteItem(modal.item)}
        />
      )}
      {modal?.type === "link" && (
        <LinkItemModal
          item={modal.item}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={(updates) => updateItem(modal.item.id, updates)}
        />
      )}
    </div>
  );
}


// ──── Workspace Card ────
function WorkspaceCard({ item, clients, hovered, onMouseEnter, onMouseLeave, onPreview, onEdit, onDelete, onLink, onCopy, onDownload }) {
  const meta = TYPE_META[item.type] || TYPE_META.note;
  const Icon = meta.icon;
  const hasFile = !!item.file_path;
  const isImage = isImageMime(item.mime_type, item.file_path);
  const isVideo = isVideoMime(item.mime_type, item.file_path);
  const isAudio = isAudioMime(item.mime_type, item.file_path);
  const clientName = item.client_id ? (clients || []).find((c) => c.id === item.client_id)?.name : null;

  // For image and video thumbnails, generate a signed URL
  const [mediaUrl, setMediaUrl] = useState(null);
  useEffect(() => {
    if ((isImage || isVideo) && item.file_path) {
      supabase.storage.from("workspace-files").createSignedUrl(item.file_path, 3600)
        .then(({ data }) => { if (data?.signedUrl) setMediaUrl(data.signedUrl); });
    }
  }, [isImage, isVideo, item.file_path]);

  return (
    <div
      style={{ ...S.workspaceCard, ...(hovered ? S.workspaceCardHover : {}) }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onPreview}
    >
      {/* Thumbnail / Preview Area */}
      {isImage && mediaUrl ? (
        <img src={mediaUrl} alt={item.title} style={S.workspaceCardThumb} />
      ) : isVideo && mediaUrl ? (
        <div style={{ position: "relative", width: "100%", height: 140, background: "#000", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <video
            src={mediaUrl}
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
          />
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(176,141,87,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
              color: "#FFF",
            }}>
              <Play size={18} fill="#FFF" style={{ marginLeft: 2 }} />
            </div>
          </div>
          <span style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            background: "rgba(0,0,0,0.75)",
            color: "#FFF",
            fontSize: 9.5,
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "IBM Plex Mono, monospace",
          }}>
            VIDEO
          </span>
        </div>
      ) : hasFile ? (
        <div style={S.workspaceCardIconArea}>
          <File size={36} color={COLORS.textFaint} />
          {item.mime_type && (
            <div style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 4, fontFamily: "IBM Plex Mono, monospace" }}>
              {item.mime_type.split("/").pop().toUpperCase()}
            </div>
          )}
        </div>
      ) : item.text_content ? (
        <div style={S.workspaceCardTextPreview}>
          {item.text_content.slice(0, 200)}
        </div>
      ) : (
        <div style={S.workspaceCardIconArea}>
          <Icon size={32} color={meta.color} />
        </div>
      )}

      {/* Card Body */}
      <div style={S.workspaceCardBody}>
        <div style={S.workspaceCardTitle}>{item.title}</div>
        <div style={S.workspaceCardMeta}>
          <span style={{ ...S.workspaceTypeBadge, background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          {item.file_size_bytes > 0 && (
            <span style={S.workspaceSizeBadge}>{formatBytes(item.file_size_bytes)}</span>
          )}
          {clientName && (
            <span style={{ fontSize: 10, color: COLORS.textDim }}>
              <Link2 size={9} style={{ verticalAlign: "middle" }} /> {clientName}
            </span>
          )}
        </div>
        {(item.tags || []).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
            {item.tags.slice(0, 4).map((t, i) => (
              <span key={i} style={S.workspaceTagChip}>{t}</span>
            ))}
            {item.tags.length > 4 && <span style={S.workspaceTagChip}>+{item.tags.length - 4}</span>}
          </div>
        )}
      </div>

      {/* Action Bar (Always clickable, styled on hover & touch) */}
      <div style={S.workspaceCardActions} onClick={(e) => e.stopPropagation()}>
        <button style={S.iconBtnGhost} onClick={onPreview} title="Preview / View Details"><Eye size={13} /></button>
        {item.text_content && <button style={S.iconBtnGhost} onClick={onCopy} title="Copy text"><Copy size={13} /></button>}
        {hasFile && <button style={S.iconBtnGhost} onClick={onDownload} title="Download"><Download size={13} /></button>}
        <button style={S.iconBtnGhost} onClick={onEdit} title="Edit Item"><Edit3 size={13} /></button>
        <button style={S.iconBtnGhost} onClick={onLink} title="Link to Client/Project"><Link2 size={13} /></button>
        <button style={{ ...S.iconBtnGhost, color: COLORS.red, marginLeft: "auto" }} onClick={onDelete} title="Delete Item"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}


// ──── Add Item Modal ────
function AddWorkspaceItemModal({ clients, plan, storageUsed, storageQuota, onClose, onSave }) {
  const [mode, setMode] = useState("text"); // text | file
  const [title, setTitle] = useState("");
  const [type, setType] = useState("template");
  const [tagsStr, setTagsStr] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(null);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const selectedClient = (clients || []).find((c) => c.id === clientId);
  const projects = selectedClient?.projects || [];

  // Quota warning
  const wouldExceed = file && (storageUsed + file.size > storageQuota);
  const afterUpload = file ? storageUsed + file.size : storageUsed;

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    if (mode === "text" && !textContent.trim()) { setErr("Content is required for text items."); return; }
    if (mode === "file" && !file) { setErr("Please select a file to upload."); return; }
    if (wouldExceed) { setErr(`This file (${formatBytes(file.size)}) would exceed your ${plan} plan storage limit.`); return; }

    setSaving(true);
    setErr("");
    try {
      await onSave({
        title: title.trim(),
        type,
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        textContent: mode === "text" ? textContent : null,
        file: mode === "file" ? file : null,
        clientId: clientId || null,
        projectId: projectId || null,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) { setFile(f); setMode("file"); }
  }

  return (
    <div style={S.overlay} className="custodian-modal-overlay" onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 560 }} className="custodian-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <h2 style={{ ...S.mainTitle, fontSize: 17 }}>Add to Resource Library</h2>
          <button style={S.iconBtnGhost} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button
            style={{ ...S.workspaceFilterChip, ...(mode === "text" ? S.workspaceFilterChipActive : {}) }}
            onClick={() => setMode("text")}
          >
            <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Text / Template
          </button>
          <button
            style={{ ...S.workspaceFilterChip, ...(mode === "file" ? S.workspaceFilterChipActive : {}) }}
            onClick={() => setMode("file")}
          >
            <Upload size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> File / Image
          </button>
        </div>

        {/* Title */}
        <label style={S.label}>Title</label>
        <input style={S.input} placeholder="e.g. Client onboarding checklist" value={title} onChange={(e) => setTitle(e.target.value)} />

        {/* Type */}
        <label style={S.label}>Type</label>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(TYPE_META).map(([id, m]) => (
            <button
              key={id}
              style={{
                ...S.workspaceFilterChip,
                ...(type === id ? { borderColor: m.color, background: m.bg, color: m.color } : {}),
                fontSize: 11, padding: "4px 10px",
              }}
              onClick={() => setType(id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Tags */}
        <label style={S.label}>Tags (comma-separated)</label>
        <input style={S.input} placeholder="e.g. react, onboarding, checklist" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />

        {/* Text Content or File Upload */}
        {mode === "text" ? (
          <>
            <label style={S.label}>Content (Markdown supported)</label>
            <textarea
              style={S.textarea}
              placeholder="Write your template, guideline, or notes here…"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
            />
          </>
        ) : (
          <>
            <label style={S.label}>File</label>
            <div
              style={{ ...S.dropZone, ...(dragging ? S.dropZoneActive : {}) }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
              {file ? (
                <div style={{ textAlign: "center" }}>
                  <CheckCircle size={20} color="#8FA98C" />
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 6 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>{formatBytes(file.size)}</div>
                  {wouldExceed && (
                    <div style={{ fontSize: 11, color: "#E07A6D", marginTop: 6 }}>
                      <AlertTriangle size={12} style={{ verticalAlign: "middle" }} /> Exceeds your {plan} plan storage limit
                    </div>
                  )}
                  {!wouldExceed && (
                    <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6 }}>
                      After upload: {formatBytes(afterUpload)} / {formatBytes(storageQuota)} used
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Upload size={24} />
                  <div>Drop a file here or click to browse</div>
                  <div style={{ fontSize: 11, color: COLORS.textFaint }}>
                    {formatBytes(storageUsed)} / {formatBytes(storageQuota)} used ({plan} plan)
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Optional Link */}
        <label style={S.label}>Link to Client / Project (optional)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <CustomDropdown
            style={{ flex: 1 }}
            value={clientId}
            placeholder="— No client (General Company Reusable) —"
            options={[
              { value: "", label: "— No client (General Company Reusable) —" },
              ...(clients || []).map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(val) => { setClientId(val); setProjectId(""); }}
          />
          {clientId && projects.length > 0 && (
            <CustomDropdown
              style={{ flex: 1 }}
              value={projectId}
              placeholder="— All projects for this client —"
              options={[
                { value: "", label: "— All projects for this client —" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              onChange={(val) => setProjectId(val)}
            />
          )}
        </div>
        <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 4, lineHeight: 1.4 }}>
          💡 <em>Linking organizes this SOP/template under this client in your library. For active live PRDs and deliverables inside a project, pin them via the project's "Pinned PRDs & Docs" tab.</em>
        </div>

        {err && (
          <div style={{ ...S.errBox, marginTop: 4 }}>
            <AlertTriangle size={13} /> {err}
          </div>
        )}

        <button
          style={{ ...S.primaryBtn, marginTop: 8, opacity: saving || wouldExceed ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving || wouldExceed}
        >
          {saving ? "Saving…" : mode === "file" ? "Upload & Save" : "Save to Workspace"}
        </button>
      </div>
    </div>
  );
}


// ──── Edit Item Modal ────
function EditWorkspaceItemModal({ item, clients, onClose, onSave }) {
  const [title, setTitle] = useState(item.title || "");
  const [type, setType] = useState(item.type || "note");
  const [tagsStr, setTagsStr] = useState((item.tags || []).join(", "));
  const [textContent, setTextContent] = useState(item.text_content || "");
  const [clientId, setClientId] = useState(item.client_id || "");
  const [projectId, setProjectId] = useState(item.project_id || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const selectedClient = (clients || []).find((c) => c.id === clientId);
  const projects = selectedClient?.projects || [];
  const hasFile = !!item.file_path;

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave({
        title: title.trim(),
        type,
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        text_content: hasFile ? item.text_content : textContent || null,
        client_id: clientId || null,
        project_id: projectId || null,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} className="custodian-modal-overlay" onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 560 }} className="custodian-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <h2 style={{ ...S.mainTitle, fontSize: 17 }}>Edit Item</h2>
          <button style={S.iconBtnGhost} onClick={onClose}><X size={16} /></button>
        </div>

        {hasFile && (
          <div style={{ ...S.infoBox, marginBottom: 4, fontSize: 11 }}>
            <File size={12} /> File: {item.file_path?.split("/").pop()} ({formatBytes(item.file_size_bytes)}) — file replacement not supported in this version.
          </div>
        )}

        <label style={S.label}>Title</label>
        <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label style={S.label}>Type</label>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(TYPE_META).map(([id, m]) => (
            <button
              key={id}
              style={{
                ...S.workspaceFilterChip,
                ...(type === id ? { borderColor: m.color, background: m.bg, color: m.color } : {}),
                fontSize: 11, padding: "4px 10px",
              }}
              onClick={() => setType(id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label style={S.label}>Tags (comma-separated)</label>
        <input style={S.input} value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />

        {!hasFile && (
          <>
            <label style={S.label}>Content</label>
            <textarea style={S.textarea} value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={8} />
          </>
        )}

        <label style={S.label}>Link to Client / Project (optional)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <CustomDropdown
            style={{ flex: 1 }}
            value={clientId}
            placeholder="— No client (General Company Reusable) —"
            options={[
              { value: "", label: "— No client (General Company Reusable) —" },
              ...(clients || []).map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(val) => { setClientId(val); setProjectId(""); }}
          />
          {clientId && projects.length > 0 && (
            <CustomDropdown
              style={{ flex: 1 }}
              value={projectId}
              placeholder="— All projects for this client —"
              options={[
                { value: "", label: "— All projects for this client —" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              onChange={(val) => setProjectId(val)}
            />
          )}
        </div>
        <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 4, lineHeight: 1.4 }}>
          💡 <em>Linking organizes this SOP/template under this client in your library. For active live PRDs and deliverables inside a project, pin them via the project's "Pinned PRDs & Docs" tab.</em>
        </div>

        {err && <div style={{ ...S.errBox, marginTop: 4 }}><AlertTriangle size={13} /> {err}</div>}

        <button style={{ ...S.primaryBtn, marginTop: 8, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}


// ──── Preview Modal ────
function PreviewWorkspaceItemModal({ item, clients, getSignedUrl, onClose, onEdit, onDelete, onCopy }) {
  const meta = TYPE_META[item.type] || TYPE_META.note;
  const hasFile = !!item.file_path;
  const isImage = isImageMime(item.mime_type, item.file_path);
  const isVideo = isVideoMime(item.mime_type, item.file_path);
  const isAudio = isAudioMime(item.mime_type, item.file_path);
  const clientName = item.client_id ? (clients || []).find((c) => c.id === item.client_id)?.name : null;
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    if (hasFile) {
      getSignedUrl(item.file_path).then(({ data }) => {
        if (data?.signedUrl) setFileUrl(data.signedUrl);
      });
    }
  }, [hasFile, item.file_path, getSignedUrl]);

  return (
    <div style={S.overlay} className="custodian-modal-overlay" onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: (isImage || isVideo) ? 760 : 600 }} className="custodian-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div>
            <h2 style={{ ...S.mainTitle, fontSize: 17 }}>{item.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ ...S.workspaceTypeBadge, background: meta.bg, color: meta.color }}>{meta.label}</span>
              {item.file_size_bytes > 0 && <span style={S.workspaceSizeBadge}>{formatBytes(item.file_size_bytes)}</span>}
              {clientName && <span style={{ fontSize: 10, color: COLORS.textDim }}><Link2 size={9} /> {clientName}</span>}
            </div>
          </div>
          <button style={S.iconBtnGhost} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Tags */}
        {(item.tags || []).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {item.tags.map((t, i) => <span key={i} style={S.workspaceTagChip}>{t}</span>)}
          </div>
        )}

        {/* Content */}
        {isImage && fileUrl ? (
          <img src={fileUrl} alt={item.title} style={{ width: "100%", borderRadius: 8, maxHeight: 500, objectFit: "contain", background: COLORS.panelAlt }} />
        ) : isVideo && fileUrl ? (
          <div style={{ width: "100%", borderRadius: 10, overflow: "hidden", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>
            <video
              controls
              playsInline
              autoPlay
              preload="auto"
              style={{
                width: "100%",
                maxHeight: "65vh",
                display: "block",
                outline: "none",
                background: "#000",
              }}
              src={fileUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : isAudio && fileUrl ? (
          <div style={{ padding: "24px 16px", textAlign: "center", background: COLORS.panelAlt, borderRadius: 10, border: `1px solid ${COLORS.line}` }}>
            <audio controls style={{ width: "100%", outline: "none" }} src={fileUrl}>
              Your browser does not support the audio tag.
            </audio>
          </div>
        ) : hasFile && fileUrl ? (
          <div style={{ textAlign: "center", padding: 30 }}>
            <File size={48} color={COLORS.textFaint} />
            <div style={{ fontSize: 13, color: COLORS.text, marginTop: 8 }}>{item.file_path?.split("/").pop()}</div>
            <div style={{ fontSize: 11, color: COLORS.textDim }}>{item.mime_type} — {formatBytes(item.file_size_bytes)}</div>
            <a href={fileUrl} download style={{ ...S.primaryBtnSm, marginTop: 12, textDecoration: "none", display: "inline-flex" }}>
              <Download size={14} /> Download File
            </a>
          </div>
        ) : item.text_content ? (
          <div style={S.codeBox}>
            {item.text_content}
          </div>
        ) : (
          <div style={S.emptyState}>No content to preview.</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          {item.text_content && (
            <button style={S.secondaryBtn} onClick={onCopy}>
              <Copy size={13} /> Copy Text
            </button>
          )}
          {hasFile && fileUrl && (
            <a href={fileUrl} download style={{ ...S.secondaryBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Download size={13} /> Download
            </a>
          )}
          <button style={S.secondaryBtn} onClick={onEdit}>
            <Edit3 size={13} /> Edit
          </button>
          <button
            style={{ ...S.secondaryBtn, color: COLORS.red, borderColor: "rgba(224, 122, 109, 0.4)", marginLeft: "auto" }}
            onClick={onDelete}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}


// ──── Delete Confirm Modal ────
function DeleteConfirmModal({ item, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={S.overlay} className="custodian-modal-overlay" onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 400 }} className="custodian-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <h2 style={{ ...S.mainTitle, fontSize: 17, color: COLORS.red }}>Delete Item</h2>
          <button style={S.iconBtnGhost} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.6 }}>
          Are you sure you want to permanently delete <strong style={{ color: COLORS.text }}>"{item.title}"</strong>?
          {item.file_path && " The uploaded file will also be removed from storage."}
          {" "}This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={S.secondaryBtn} onClick={onClose} disabled={deleting}>Cancel</button>
          <button
            style={{ ...S.primaryBtnSm, background: COLORS.red, borderColor: COLORS.red, opacity: deleting ? 0.6 : 1 }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Yes, Delete Item"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ──── Link/Unlink Modal ────
function LinkItemModal({ item, clients, onClose, onSave }) {
  const [clientId, setClientId] = useState(item.client_id || "");
  const [projectId, setProjectId] = useState(item.project_id || "");
  const [saving, setSaving] = useState(false);

  const selectedClient = (clients || []).find((c) => c.id === clientId);
  const projects = selectedClient?.projects || [];

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        title: item.title,
        client_id: clientId || null,
        project_id: projectId || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} className="custodian-modal-overlay" onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 420 }} className="custodian-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <h2 style={{ ...S.mainTitle, fontSize: 17 }}>Link to Client / Project</h2>
          <button style={S.iconBtnGhost} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>
          Link <strong style={{ color: COLORS.text }}>"{item.title}"</strong> to a specific client or project, or leave unlinked for general use.
        </div>

        <label style={S.label}>Client</label>
        <CustomDropdown
          value={clientId}
          placeholder="— None (General) —"
          options={[
            { value: "", label: "— None (General) —" },
            ...(clients || []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(val) => { setClientId(val); setProjectId(""); }}
        />

        {clientId && projects.length > 0 && (
          <>
            <label style={{ ...S.label, marginTop: 12 }}>Project</label>
            <CustomDropdown
              value={projectId}
              placeholder="— None —"
              options={[
                { value: "", label: "— None —" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              onChange={(val) => setProjectId(val)}
            />
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={S.secondaryBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...S.primaryBtnSm, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
