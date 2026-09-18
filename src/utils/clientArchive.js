import JSZip from "jszip";

/**
 * Sanitizes a string for use as a folder or file name in ZIP archives.
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeFileName(str) {
  if (!str || typeof str !== "string") return "Untitled";
  const cleaned = str
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/[\s_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Untitled";
}

/**
 * Formats a project's credentials into a standard .env file content string.
 * @param {Array} credentials 
 * @returns {string}
 */
export function formatCredentialsToEnv(credentials = []) {
  if (!credentials || credentials.length === 0) {
    return "# No environment credentials stored for this project.\n";
  }

  const lines = [
    `# =========================================================`,
    `# CUSTODIAN ZERO-KNOWLEDGE ARCHIVE — PROJECT ENVIRONMENT SECRETS`,
    `# Generated: ${new Date().toISOString()}`,
    `# =========================================================\n`,
  ];

  for (const cred of credentials) {
    const key = (cred.username || cred.label || "SECRET_KEY")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");
    const val = cred.password || "";
    const envTag = cred.environment ? ` [${cred.environment.toUpperCase()}]` : "";
    const typeTag = cred.secretType ? ` (${cred.secretType})` : "";

    lines.push(`# ${cred.label}${envTag}${typeTag}`);
    if (cred.url) lines.push(`# Docs: ${cred.url}`);
    lines.push(`${key}="${val.replace(/"/g, '\\"')}"\n`);
  }

  return lines.join("\n");
}

/**
 * Formats project specification notes, deadlines, and deliverables checklist.
 * @param {object} project 
 * @returns {string}
 */
export function formatProjectSpecs(project = {}) {
  const details = project.details || {};
  const checklist = details.checklist || [];

  const lines = [
    `=========================================================`,
    `PROJECT SPECIFICATIONS & CLIENT CONTRACT DELIVERABLES`,
    `Project: ${project.name || "Untitled Project"}`,
    `Generated: ${new Date().toISOString()}`,
    `=========================================================\n`,
    `Final Client Deadline: ${details.lastDate || "None set"}`,
    `Target Finish Goal:    ${details.lastPartialDate || "None set"}`,
    `Contract Scope Revisions: ${details.scopeEditsCount || 0}\n`,
    `---------------------------------------------------------`,
    `PROJECT SPECIFICATION NOTES & STAGING INSTRUCTIONS:`,
    `---------------------------------------------------------`,
    details.notes ? details.notes.trim() : "No specification notes recorded.",
    `\n---------------------------------------------------------`,
    `DELIVERABLES CHECKLIST (${checklist.filter((i) => i.completed).length}/${checklist.length} Completed):`,
    `---------------------------------------------------------`,
  ];

  if (checklist.length === 0) {
    lines.push("No checklist items recorded.");
  } else {
    for (const item of checklist) {
      lines.push(`[${item.completed ? "X" : " "}] ${item.text || item.label || "Item"}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Generates an executive summary markdown document for the ghosted/cancelled client.
 * @param {object} client 
 * @param {string} reasonNotes 
 * @param {string} archiveDate 
 * @returns {string}
 */
export function generateClientSummary(client = {}, reasonNotes = "", archiveDate = new Date().toISOString()) {
  const projects = client.projects || [];
  const totalSecrets = projects.reduce((acc, p) => acc + (p.credentials?.length || 0), 0);

  const formattedDate = new Date(archiveDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `# CUSTODIAN — CLIENT ARCHIVE PACKAGE

**Client Workspace:** ${client.name || "Client"}
**Archive Status:** 👻 CANCELLED / GHOSTED
**Date Archived:** ${formattedDate}
**Archived By:** Freelancer / Project Owner via Custodian Pro

---

## 📋 Cancellation / Ghosting Notes
${reasonNotes && reasonNotes.trim() ? reasonNotes.trim() : "_No specific reason recorded by freelancer._"}

---

## 📦 Archived Projects Overview (${projects.length} Projects, ${totalSecrets} Total Secrets)

${
  projects.length === 0
    ? "_No projects recorded under this client._"
    : projects
        .map(
          (p, idx) => `### ${idx + 1}. ${p.name}
- **Secrets & API Keys:** ${p.credentials?.length || 0} credentials
- **Client Deadline:** ${p.details?.lastDate || "No deadline recorded"}
- **Checklist Items:** ${(p.details?.checklist || []).length} items
- **Specs / Notes:** ${p.details?.notes ? "Included in project folder" : "None"}
`
        )
        .join("\n")
}

---

## 🔄 Instructions When Client Returns
1. **To Restore Workspace in Custodian:**
   Open Custodian → Go to **Recycle Bin & Trash** → Click the **👻 Ghosted Clients** tab → Click **"Reactivate Client"**.
   The entire workspace and all project secrets will be restored to your active vault immediately.

2. **To Hand Over Credentials to Client:**
   Send them this ZIP archive. Each project has its own dedicated folder containing:
   - \`credentials.env\` (Ready-to-use .env configuration file)
   - \`credentials.json\` (Machine-readable backup of all secrets)
   - \`specs_and_deadlines.txt\` (Deliverables checklist and contract scope notes)

---
*Generated with zero-knowledge AES-256-GCM architecture by Custodian.*
`;
}

/**
 * Builds a compressed JSZip instance containing all projects, .env files, JSON secrets, and summary docs.
 * @param {object} client 
 * @param {object} [options]
 * @param {string} [options.reasonNotes=""]
 * @param {string} [options.archiveDate]
 * @returns {Promise<JSZip>}
 */
export async function generateClientArchiveZip(client = {}, options = {}) {
  const { reasonNotes = "", archiveDate = new Date().toISOString() } = options;
  const zip = new JSZip();

  // 1. Root Executive Summary
  zip.file("CLIENT_SUMMARY.md", generateClientSummary(client, reasonNotes, archiveDate));

  // 2. Add folders for each project
  const projects = client.projects || [];
  for (const proj of projects) {
    const folderName = sanitizeFileName(proj.name || "Project");
    const projFolder = zip.folder(folderName);

    // .env file
    projFolder.file("credentials.env", formatCredentialsToEnv(proj.credentials || []));

    // credentials.json
    const credsJson = JSON.stringify(
      (proj.credentials || []).map((c) => ({
        label: c.label,
        key: c.username || c.label,
        secret: c.password,
        url: c.url || null,
        environment: c.environment || "global",
        secretType: c.secretType || "env_var",
        cost: c.cost || null,
        renewalDate: c.renewalDate || null,
      })),
      null,
      2
    );
    projFolder.file("credentials.json", credsJson);

    // specs and checklist
    projFolder.file("specs_and_deadlines.txt", formatProjectSpecs(proj));
  }

  return zip;
}

/**
 * Generates the ZIP blob and initiates browser file download.
 * @param {object} client 
 * @param {object} [options]
 * @param {string} [options.reasonNotes=""]
 * @returns {Promise<Blob>}
 */
export async function downloadClientArchiveZip(client = {}, options = {}) {
  const zip = await generateClientArchiveZip(client, options);
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const clientSlug = sanitizeFileName(client.name || "Client");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${clientSlug}-Ghosted-Archive-${dateStr}.zip`;

  // Trigger browser download if DOM available
  if (typeof document !== "undefined" && document.createElement) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return blob;
}
