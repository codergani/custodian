import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  PackageCheck, ShieldCheck, Download, Upload, Users, FileText, Sparkles,
  Building2, Folder, KeyRound, Check, Copy, AlertTriangle, Eye, EyeOff, Plus,
  Trash2, Calendar, DollarSign, Clock, ExternalLink, RefreshCw, X, UserPlus,
  ShieldAlert, Zap, CheckCircle2, Bell, BellRing, Crown, User, RotateCcw, Dices,
  Ghost, FileArchive
} from "lucide-react";
import PasswordGenerator from "./PasswordGenerator";
import { supabase } from "../supabaseClient";
import { S, COLORS } from "../styles";
import { CustomDropdown, ToggleSwitch, Overlay, calculateSecurityHealth } from "./shared";
import { calculateProjectReadiness } from "../utils/projectReadiness";
import { openLemonCheckout } from "../utils/lemonsqueezy";
import { isNative } from "../native/nativeBridge";
import { purchaseSubscriptionPackage, restoreNativePurchases } from "../native/revenueCat";

import { shareSecret, importPublicKey } from "../crypto";
import { VAULT_PLANS } from "../config/plans";


export default function ModalRouter({ modal, currentPlan, defaultCurrency, userId, userEmail, ecdhPrivateKey, onClose, onAddClient, onAddProject, onUpdateProjectDetails, onAddCred, onUpdateCred, onImportEnv, onUpgradePlan, onOpenUpgrade, onGhostClient, onMoveClientToTrash, showSuccess }) {

  const [name, setName] = useState("");

  if (modal.type === "generator") {
    return (
      <Overlay onClose={onClose} title="Secure Generator" icon={<Dices size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 600 }}>
        <PasswordGenerator compact={false} />
      </Overlay>
    );
  }

  if (modal.type === "share_secret") {
    return (
      <Overlay onClose={onClose} title="Zero-Knowledge Secret Sharing" icon={<ShieldCheck size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 560 }}>
        <ShareSecretModalContent
          userId={userId}
          ecdhPrivateKey={ecdhPrivateKey}
          initialCred={modal.initialCred}
          onClose={onClose}
          showSuccess={showSuccess}
        />
      </Overlay>
    );
  }


  if (modal.type === "readiness_audit") {
    return (
      <Overlay onClose={onClose} title={`Operational Readiness — ${modal.project.name}`} icon={<ShieldCheck size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 580 }}>
        <ProjectReadinessAuditModalContent project={modal.project} allRenewals={modal.allRenewals || []} onClose={onClose} />
      </Overlay>
    );
  }
  if (modal.type === "edit_deployment") {
    return (
      <Overlay onClose={onClose} title={`Deployment Runbook — ${modal.project.name}`} icon={<FileText size={18} color="#7AA2E3" />} cardStyle={{ ...S.modalCard, maxWidth: 580 }}>
        <EditDeploymentContent
          project={modal.project}
          onSave={(updatedDeploy) => {
            const currentDetails = modal.project.details || {};
            onUpdateProjectDetails(modal.project.id, {
              ...currentDetails,
              deployment: updatedDeploy,
              productionUrl: updatedDeploy.productionUrl,
              stagingUrl: updatedDeploy.stagingUrl,
              repoUrl: updatedDeploy.repository,
            });
          }}
        />
      </Overlay>
    );
  }
  if (modal.type === "handover") {
    if (currentPlan === "free") {
      return (
        <Overlay onClose={onClose} title="Pro Feature: Client Handover" icon={<PackageCheck size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 500 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center", padding: "16px 8px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(176,141,87,0.12)", border: "1px solid #B08D57", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: COLORS.brass }}>
              <PackageCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: COLORS.text }}>1-Click Client Handover Package</h3>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
                Generate executive-ready client handover documents compiling all deliverables, staging specs, and production secrets in one polished markdown package.
              </p>
            </div>
            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "12px", textAlign: "left", fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
                <CheckCircle2 size={13} color={COLORS.brass} /> Complete deliverables checklist summary
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
                <CheckCircle2 size={13} color={COLORS.brass} /> Formatted multi-environment credentials block
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
                <CheckCircle2 size={13} color={COLORS.brass} /> 1-Click Copy and .md file download
              </div>
            </div>
            <button
              type="button"
              style={{ ...S.primaryBtn, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={() => onOpenUpgrade ? onOpenUpgrade() : onClose()}
            >
              <Sparkles size={14} /> Upgrade to Pro ($8 / mo)
            </button>
          </div>
        </Overlay>
      );
    }
    return (
      <Overlay onClose={onClose} title={`Client Handover — ${modal.project.name}`} icon={<PackageCheck size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 620 }}>
        <HandoverPackageContent project={modal.project} clientName={modal.clientName} onClose={onClose} showSuccess={showSuccess} />
      </Overlay>
    );
  }
  if (modal.type === "health_audit") {
    return (
      <Overlay onClose={onClose} title={`Vault Security Audit — ${modal.project.name}`} icon={<ShieldCheck size={18} color="#8FA98C" />} cardStyle={{ ...S.modalCard, maxWidth: 540 }}>
        <SecurityHealthAuditModalContent project={modal.project} onClose={onClose} />
      </Overlay>
    );
  }
  if (modal.type === "import_env") {
    return (
      <Overlay onClose={onClose} title="Import .env Variables" icon={<Download size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 520 }}>
        <ImportEnvContent projectId={modal.projectId} onImport={onImportEnv} onClose={onClose} />
      </Overlay>
    );
  }
  if (modal.type === "export_env") {
    return (
      <Overlay onClose={onClose} title={`Export .env — ${modal.project.name}`} icon={<Upload size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 560 }}>
        <ExportEnvContent project={modal.project} onClose={onClose} showSuccess={showSuccess} />
      </Overlay>
    );
  }
  if (modal.type === "team_members") {
    const isTeamOrFounder = currentPlan === "team" || currentPlan === "founder";
    if (!isTeamOrFounder) {
      return (
        <Overlay onClose={onClose} title="Team Feature: Shared Vaults" icon={<Users size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 500 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center", padding: "16px 8px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(176,141,87,0.12)", border: "1px solid #B08D57", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: COLORS.brass }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: COLORS.text }}>Shared Team Vaults</h3>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
                Invite team members, assign granular role permissions (Full vs Skeleton Only), and collaborate securely on client infrastructure.
              </p>
            </div>
            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "12px", textAlign: "left", fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
                <CheckCircle2 size={13} color={COLORS.brass} /> Centralized team key revocation & audit
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
                <CheckCircle2 size={13} color={COLORS.brass} /> Owner covers all invited team members
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.text }}>
                <CheckCircle2 size={13} color={COLORS.brass} /> Developer skeleton mode for zero-trust onboarding
              </div>
            </div>
            <button
              type="button"
              style={{ ...S.primaryBtn, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={() => onOpenUpgrade ? onOpenUpgrade() : onClose()}
            >
              <Sparkles size={14} /> Upgrade to Team ($19 / mo)
            </button>
          </div>
        </Overlay>
      );
    }
    return (
      <Overlay onClose={onClose} title={`Team & Members — ${modal.client.name}`} icon={<Users size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 560 }}>
        <TeamMembersContent client={modal.client} userId={userId} onClose={onClose} showSuccess={showSuccess} />
      </Overlay>
    );
  }
  if (modal.type === "edit_project_details") {
    return (
      <Overlay onClose={onClose} title={`Deadlines & Scope — ${modal.project.name}`} icon={<FileText size={18} color="#B08D57" />} cardStyle={{ ...S.modalCard, maxWidth: 560 }}>
        <EditProjectDetailsContent
          project={modal.project}
          onSave={(details) => onUpdateProjectDetails(modal.project.id, details)}
        />
      </Overlay>
    );
  }
  if (modal.type === "upgrade") {
    return (
      <Overlay onClose={onClose} title="Choose your plan" icon={<Sparkles size={18} color="#B08D57" />} cardStyle={S.upgradeModalCard}>
        <UpgradePlansContent
          currentPlan={currentPlan}
          userId={userId}
          userEmail={userEmail}
          onSelectPlan={onUpgradePlan}
        />
      </Overlay>
    );
  }

  if (modal.type === "client") {
    return (
      <Overlay onClose={onClose} title="New Client Workspace" icon={<Building2 size={18} color={COLORS.brass} />}>
        <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: "0 0 10px", lineHeight: 1.5 }}>
          Create a dedicated workspace for this client. All projects, API credentials, and delivery timelines under this client will be completely isolated.
        </p>
        <label style={S.label}>Client / Company Name</label>
        <input style={S.input} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp, Nyaya AI, or 'Personal'" />
        <button style={{ ...S.primaryBtn, marginTop: 12 }} disabled={!name.trim()} onClick={() => onAddClient(name.trim())}>Create Client Workspace</button>
      </Overlay>
    );
  }
  if (modal.type === "project") {
    return (
      <Overlay onClose={onClose} title="New Project Workspace" icon={<Folder size={18} color={COLORS.brass} />}>
        <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: "0 0 10px", lineHeight: 1.5 }}>
          Add a project repository or app under this client (e.g. Web App, Mobile App, API Backend) to track encrypted secrets and delivery buffers.
        </p>
        <label style={S.label}>Project Name</label>
        <input style={S.input} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Web Application, Mobile App, Admin Dashboard" />
        <button style={{ ...S.primaryBtn, marginTop: 12 }} disabled={!name.trim()} onClick={() => onAddProject(modal.clientId, name.trim())}>Create Project</button>
      </Overlay>
    );
  }
  if (modal.type === "cred" || modal.type === "edit_cred") {
    return (
      <Overlay
        onClose={onClose}
        title={modal.type === "edit_cred" ? "Edit Credential & Renewal Info" : "New Encrypted Secret"}
        icon={<KeyRound size={18} color={COLORS.brass} />}
        cardStyle={{ ...S.modalCard, maxWidth: 520, maxHeight: "90vh" }}
      >
        <CredFormContent
          initialData={modal.cred || modal.initialData}
          isEdit={modal.type === "edit_cred"}
          currentPlan={currentPlan}
          defaultCurrency={defaultCurrency}
          onOpenUpgrade={onOpenUpgrade}
          onSave={(data) => {
            if (modal.type === "edit_cred") {
              onUpdateCred(modal.cred.id, data);
            } else {
              onAddCred(modal.projectId, data);
            }
          }}
        />
      </Overlay>
    );
  }

  if (modal.type === "ghost_client") {
    return (
      <Overlay
        onClose={onClose}
        title={`Archive & Ghost Client — ${modal.client.name}`}
        icon={<Ghost size={18} color="#B08D57" />}
        cardStyle={{ ...S.modalCard, maxWidth: 540 }}
      >
        <GhostClientModalContent
          client={modal.client}
          onGhost={(client, notes) => onGhostClient(client, notes)}
          onMoveToTrash={(clientId) => onMoveClientToTrash(clientId)}
          onClose={onClose}
        />
      </Overlay>
    );
  }

  if (modal.type === "client_delete_options") {
    return (
      <Overlay
        onClose={onClose}
        title={`Delete Client — ${modal.client.name}`}
        icon={<Trash2 size={18} color={COLORS.red} />}
        cardStyle={{ ...S.modalCard, maxWidth: 520 }}
      >
        <ClientDeleteFreeModalContent
          client={modal.client}
          onOpenUpgrade={onOpenUpgrade}
          onMoveToTrash={(clientId) => onMoveClientToTrash(clientId)}
          onClose={onClose}
        />
      </Overlay>
    );
  }

  return null;
}

function EditProjectDetailsContent({ project, onSave }) {
  const existing = project.details || {};
  const [lastDate, setLastDate] = useState(existing.lastDate || "");
  const [lastPartialDate, setLastPartialDate] = useState(existing.lastPartialDate || "");
  const [notes, setNotes] = useState(existing.notes || "");
  const [dateErr, setDateErr] = useState("");

  function sanitizeDate(dStr) {
    if (!dStr) return null;
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

  function handleSubmit(e) {
    e?.preventDefault();
    setDateErr("");

    if (lastDate && !sanitizeDate(lastDate)) {
      setDateErr("Please enter a valid Client Deadline with a 4-digit year (between 2000 and 2099).");
      return;
    }
    if (lastPartialDate && !sanitizeDate(lastPartialDate)) {
      setDateErr("Please enter a valid Target Finish Goal with a 4-digit year (between 2000 and 2099).");
      return;
    }

    const wasNotesChanged = (notes || "").trim() !== (existing.notes || "").trim();
    const wasDatesChanged = lastDate !== (existing.lastDate || "") || lastPartialDate !== (existing.lastPartialDate || "");
    const incrementScope = wasNotesChanged || wasDatesChanged ? (existing.scopeEditsCount || 0) + 1 : (existing.scopeEditsCount || 0);

    onSave({
      ...existing,
      lastDate,
      lastPartialDate,
      notes,
      scopeEditsCount: incrementScope,
    });
  }

  let previewBuffer = null;
  const validLD = sanitizeDate(lastDate);
  const validLPD = sanitizeDate(lastPartialDate);
  if (validLD && validLPD) {
    previewBuffer = Math.round((validLD.getTime() - validLPD.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {dateErr && (
        <div style={{ ...S.errBox, margin: 0, padding: "8px 12px", fontSize: 12 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {dateErr}
        </div>
      )}

      {/* Balanced 2-Column Date Pickers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ ...S.label, margin: 0 }}>Final Client Deadline</label>
          <input
            style={{ ...S.input, padding: "8px 10px", width: "100%" }}
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={lastDate}
            onChange={(e) => {
              setDateErr("");
              setLastDate(e.target.value);
            }}
          />
          <div style={{ fontSize: 10.5, color: COLORS.textFaint }}>Official contract delivery date</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ ...S.label, margin: 0 }}>Target Finish Goal</label>
          <input
            style={{ ...S.input, padding: "8px 10px", width: "100%" }}
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={lastPartialDate}
            onChange={(e) => {
              setDateErr("");
              setLastPartialDate(e.target.value);
            }}
          />
          <div style={{ fontSize: 10.5, color: COLORS.textFaint }}>Internal completion target</div>
        </div>
      </div>

      {previewBuffer !== null && (
        <div style={{
          ...S.infoBox,
          background: previewBuffer < 0 ? "rgba(224,122,109,0.08)" : "rgba(45,106,66,0.08)",
          borderColor: previewBuffer < 0 ? "rgba(224,122,109,0.3)" : "rgba(45,106,66,0.25)",
          color: previewBuffer < 0 ? "#E07A6D" : COLORS.green,
          fontSize: 12,
          padding: "8px 12px"
        }}>
          <ShieldCheck size={15} color={previewBuffer < 0 ? "#E07A6D" : COLORS.green} style={{ flexShrink: 0 }} />
          <span>
            <strong>Delivery Safety Buffer:</strong> {previewBuffer >= 0 ? `${previewBuffer} day${previewBuffer !== 1 ? "s" : ""} buffer reserved between your target goal and client deadline.` : `⚠️ Target goal is ${Math.abs(previewBuffer)} days past client deadline.`}
          </span>
        </div>
      )}

      {/* Scope & Requirement Notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ ...S.label, margin: 0 }}>Project Scope & Requirement Notes</label>
        <textarea
          style={{ ...S.textarea, minHeight: 110, fontSize: 13, lineHeight: 1.5 }}
          placeholder="Client requested feature changes, staging server instructions, API key scope..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button style={{ ...S.primaryBtn, padding: "9px 16px", marginTop: 2 }} type="submit">
        Save Deadlines & Specs
      </button>
    </form>
  );
}

function CredFormContent({ initialData, isEdit, currentPlan, defaultCurrency = "$", onOpenUpgrade, onSave }) {
  const [secretType, setSecretType] = useState(initialData?.secretType || "env_var");
  const [label, setLabel] = useState(initialData?.label || "");
  const [username, setUsername] = useState(
    initialData?.username === "Recovery Words" && (initialData?.secretType === "note" || !initialData?.secretType)
      ? ""
      : initialData?.username || ""
  );
  const [password, setPassword] = useState(initialData?.password || "");
  const [showPassword, setShowPassword] = useState(
    initialData?.secretType === "note" || (!initialData && secretType === "note")
  );
  const [showInlineGenerator, setShowInlineGenerator] = useState(false);
  const [url, setUrl] = useState(initialData?.url || "");
  const [showMoreOptions, setShowMoreOptions] = useState(!!initialData?.url);
  const [environment, setEnvironment] = useState(initialData?.environment || "global");

  const [trackRenewal, setTrackRenewal] = useState(!!initialData?.renewalDate || (initialData?.cost !== undefined && initialData?.cost !== null && initialData?.cost !== ""));
  const [renewalDate, setRenewalDate] = useState(initialData?.renewalDate || "");
  const [billingFrequency, setBillingFrequency] = useState(initialData?.billingFrequency || "monthly");
  const [cost, setCost] = useState(initialData?.cost !== null && initialData?.cost !== undefined ? String(initialData.cost) : "");
  const [costError, setCostError] = useState("");
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency || "$");
  const [alertIntent, setAlertIntent] = useState(initialData?.alertIntent || "review_cancel");
  const [reminderDays, setReminderDays] = useState(initialData?.reminderDays || "1");
  const [cancelUrl, setCancelUrl] = useState(initialData?.cancelUrl || "");
  const [isCanceled, setIsCanceled] = useState(!!initialData?.isCanceled);

  // Auto-fill template keys when switching preset type on empty forms
  const applyPreset = (type) => {
    setSecretType(type);
    if (type === "note") {
      setShowPassword(true);
      if (username === "Recovery Words") {
        setUsername("");
      }
    }
    if (!label && !username) {
      if (type === "login") {
        setLabel("Personal Account");
        setUsername("");
      } else if (type === "pin") {
        setLabel("Mobile PIN");
        setUsername("PIN");
      } else if (type === "note") {
        setLabel("Google Backup Codes");
        setUsername("");
      } else if (type === "card") {
        setLabel("Bank Card");
        setUsername("");
      } else if (type === "database") {
        setLabel("Production Database");
        setUsername("DATABASE_URL");
      } else if (type === "stripe") {
        setLabel("Stripe Secret Key");
        setUsername("STRIPE_SECRET_KEY");
      } else if (type === "supabase") {
        setLabel("Supabase Service Key");
        setUsername("SUPABASE_SERVICE_ROLE_KEY");
      } else if (type === "aws") {
        setLabel("AWS Secret Access Key");
        setUsername("AWS_SECRET_ACCESS_KEY");
      } else if (type === "api_key") {
        setLabel("OpenAI API Key");
        setUsername("OPENAI_API_KEY");
      } else if (type === "ssh") {
        setLabel("Production Server SSH");
        setUsername("SSH_PRIVATE_KEY");
      }
    }
  };

  const isPersonalType = ["login", "pin", "note", "card"].includes(secretType);

  const keyTitle = isPersonalType
    ? secretType === "login"
      ? "ACCOUNT IDENTIFIER (USERNAME / EMAIL)"
      : secretType === "pin"
      ? "PIN LABEL / IDENTIFIER"
      : secretType === "note"
      ? "ACCOUNT / TAG (OPTIONAL)"
      : "CARD DETAILS (HOLDER / LAST 4)"
    : "ENVIRONMENT VARIABLE (KEY = VALUE)";

  const keyPlaceholder = isPersonalType
    ? secretType === "login"
      ? "e.g. user@gmail.com or @handle"
      : secretType === "pin"
      ? "e.g. App PIN, Wi-Fi SSID"
      : secretType === "note"
      ? "e.g. youremail@gmail.com"
      : "e.g. Cardholder Name / Last 4"
    : "VARIABLE_KEY";

  const valPlaceholder = isPersonalType
    ? secretType === "login"
      ? "Account Password"
      : secretType === "pin"
      ? "Secret PIN or Passcode"
      : secretType === "note"
      ? "Paste your backup codes or secret text here..."
      : "CVV, PIN or Card Security Code"
    : "secret_token_value";

  const purposePlaceholder = isPersonalType
    ? secretType === "login"
      ? "e.g. Personal Gmail, Netflix, Twitter"
      : secretType === "pin"
      ? "e.g. Banking App PIN, Home Wi-Fi"
      : secretType === "note"
      ? "e.g. Google Backup Codes, Recovery Words, Private Keys"
      : "e.g. ICICI Bank Credit Card"
    : "e.g. Stripe Prod, OpenAI, Postgres URL";

  function handleCostChange(e) {
    const val = e.target.value;
    setCost(val);
    if (val === "") {
      setCostError("");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setCostError("Estimated cost must be greater than 0 (e.g. 0.01 or 20.00).");
    } else {
      setCostError("");
    }
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!label.trim()) return;

    if (trackRenewal && cost !== "") {
      const parsed = parseFloat(cost);
      if (isNaN(parsed) || parsed <= 0) {
        setCostError("Estimated cost must be greater than 0 (e.g. 0.01 or 20.00).");
        return;
      }
    }

    const sanitizedCostStr = trackRenewal && cost !== "" && !isNaN(parseFloat(cost)) && parseFloat(cost) > 0
      ? String(parseFloat(cost))
      : null;

    onSave({
      secretType,
      label: label.trim(),
      username: username.trim(),
      password,
      url: url.trim(),
      environment: environment || "global",
      renewalDate: trackRenewal ? renewalDate : null,
      billingFrequency: trackRenewal ? billingFrequency : null,
      cost: sanitizedCostStr,
      currency: trackRenewal ? currency : "$",
      alertIntent: trackRenewal ? alertIntent : "review_cancel",
      reminderDays: trackRenewal ? reminderDays : null,
      cancelUrl: trackRenewal && cancelUrl ? cancelUrl.trim() : null,
      isCanceled: trackRenewal ? isCanceled : false,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 0. Secret Type Presets Bar */}
      <div>
        <label style={{ ...S.label, marginBottom: 4 }}>Secret Type</label>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", overflowX: "auto" }} className="custodian-hscroll">
          {(isPersonalType
            ? [
                { id: "login", label: "📧 Login / Account" },
                { id: "pin", label: "📱 PIN / Wi-Fi" },
                { id: "note", label: "📝 Note / Backup Codes" },
                { id: "card", label: "💳 Card & Bank" },
              ]
            : [
                { id: "env_var", label: "📦 Env Var" },
                { id: "database", label: "🗄️ Database" },
                { id: "api_key", label: "🔑 API Key" },
                { id: "stripe", label: "💳 Stripe" },
                { id: "supabase", label: "⚡ Supabase" },
                { id: "aws", label: "☁️ AWS" },
                { id: "ssh", label: "🔒 SSH" },
                { id: "generic", label: "🌐 Generic" },
              ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              style={{
                ...S.secondaryBtn,
                padding: "4px 9px",
                fontSize: 11.5,
                borderRadius: 6,
                background: secretType === t.id ? "rgba(176,141,87,0.18)" : "transparent",
                borderColor: secretType === t.id ? COLORS.brass : COLORS.line,
                color: secretType === t.id ? COLORS.brass : COLORS.textDim,
                fontWeight: secretType === t.id ? 600 : 400,
              }}
              onClick={() => applyPreset(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Service / Title & Environment Scope */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: isPersonalType ? 1 : 1.2 }}>
          <label style={{ ...S.label, marginBottom: 4 }}>
            {isPersonalType ? "Item Name / Title *" : "Secret Name / Purpose *"}
          </label>
          <input
            style={{ ...S.input, padding: "8px 12px", fontSize: 13 }}
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={purposePlaceholder}
            required
          />
        </div>
        {!isPersonalType && (
          <div style={{ flex: 1 }}>
            <label style={{ ...S.label, marginBottom: 4 }}>Environment Scope</label>
            <CustomDropdown
              value={environment}
              onChange={setEnvironment}
              options={[
                { value: "global", label: "🌐 Global / All Envs" },
                { value: "prod", label: "🚀 Production (Live)" },
                { value: "staging", label: "🧪 Staging / UAT" },
                { value: "dev", label: "💻 Development (Local)" },
              ]}
              buttonStyle={{ padding: "8px 10px", fontSize: 12 }}
            />
          </div>
        )}
      </div>

      {/* 2. Developer Key = Value Pair / Dedicated Note & Backup Codes Layout */}
      {secretType === "note" ? (
        <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Optional Account / Identifier Tag */}
          <div>
            <label style={{ ...S.label, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Account / Identifier (Optional)</span>
              <span style={{ fontSize: 10.5, color: COLORS.textFaint, fontWeight: "normal" }}>e.g. youremail@gmail.com</span>
            </label>
            <input
              style={{ ...S.input, padding: "8px 10px", fontSize: 12.5 }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. user@gmail.com or 2FA Recovery"
            />
          </div>

          {/* Backup Codes / Secret Content Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            <label style={{ ...S.label, marginBottom: 0, color: COLORS.brass, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <FileText size={13} />
              <span>Secret Backup Codes / Note Content *</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
                {password ? `${password.split('\n').filter(l => l.trim().length > 0).length} code(s) / line(s) • ${password.length} chars` : "0 lines"}
              </span>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 4,
                  padding: "2px 7px",
                  color: COLORS.textDim,
                  cursor: "pointer",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Mask secret content" : "Reveal plain text"}
              >
                {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{showPassword ? "Mask" : "Reveal"}</span>
              </button>
            </div>
          </div>

          {/* Dedicated Textarea for Backup Codes & Private Notes */}
          <textarea
            style={{
              ...S.input,
              padding: "10px 12px",
              fontSize: 12.5,
              fontFamily: "IBM Plex Mono, monospace",
              lineHeight: 1.6,
              minHeight: 140,
              maxHeight: 320,
              width: "100%",
              resize: "vertical",
              boxSizing: "border-box",
              WebkitTextSecurity: showPassword ? "none" : "disc",
            }}
            rows={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Paste your Google backup codes, recovery phrase, or secret text here...\n\nExample:\n1234 5678\n8765 4321\n9900 1122`}
            required
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: COLORS.textFaint }}>
            <span>Tip: Paste all 10 backup codes here — line breaks and spacing are fully encrypted.</span>
            {password && (
              <button
                type="button"
                style={{ background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 11, padding: 0 }}
                onClick={() => setPassword("")}
              >
                Clear text
              </button>
            )}
          </div>

          {/* Live Client-Side Encryption Trust Indicator */}
          <div style={S.formSecurityNotice}>
            <ShieldCheck size={13} color={COLORS.green} style={{ flexShrink: 0 }} />
            <span>Client-Side AES-256-GCM Active • Encrypted locally before saving</span>
          </div>
        </div>
      ) : (
        <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: isPersonalType ? "inherit" : "IBM Plex Mono, monospace", letterSpacing: "0.04em" }}>
            {keyTitle}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Key / Variable Name */}
            <div style={{ flex: 1 }}>
              <input
                style={{ ...S.input, padding: "8px 10px", fontSize: 12.5, fontFamily: isPersonalType ? "inherit" : "IBM Plex Mono, monospace" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={keyPlaceholder}
              />
            </div>

            <span style={{ color: COLORS.brass, fontWeight: 700, fontSize: 16, fontFamily: "IBM Plex Mono, monospace" }}>
              {isPersonalType ? "•" : "="}
            </span>

            {/* Secret Value with Show/Hide Eye */}
            <div style={{ flex: 1.3, position: "relative", display: "flex", alignItems: "center" }}>
              <input
                style={{ ...S.input, padding: "8px 32px 8px 10px", fontSize: 12.5, fontFamily: "IBM Plex Mono, monospace", width: "100%" }}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={valPlaceholder}
              />
              <button
                type="button"
                style={{ position: "absolute", right: 6, background: "transparent", border: "none", color: COLORS.textFaint, cursor: "pointer", padding: 3, display: "flex", alignItems: "center" }}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide value" : "Show value"}
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            style={{
              ...S.secondaryBtn,
              padding: "4px 10px",
              fontSize: 11,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: COLORS.brass,
              borderColor: COLORS.brassDim,
              background: showInlineGenerator ? "rgba(176,141,87,0.12)" : "transparent",
              alignSelf: "flex-start",
            }}
            onClick={() => setShowInlineGenerator(!showInlineGenerator)}
            title="Generate a secure random value"
          >
            <Dices size={12} /> {showInlineGenerator ? "Hide Generator" : "⚡ Generate"}
          </button>

          {/* Inline Compact Generator */}
          {showInlineGenerator && (
            <div style={{
              background: COLORS.panel,
              border: `1.5px solid ${COLORS.brassDim}`,
              borderRadius: 10,
              padding: "12px 14px",
              marginTop: 2,
            }}>
              <PasswordGenerator
                compact={true}
                onUseValue={(val) => {
                  setPassword(val);
                  setShowPassword(true);
                  setShowInlineGenerator(false);
                }}
                onClose={() => setShowInlineGenerator(false)}
              />
            </div>
          )}

          {/* Live Client-Side Encryption Trust Indicator */}
          <div style={S.formSecurityNotice}>
            <ShieldCheck size={13} color={COLORS.green} style={{ flexShrink: 0 }} />
            <span>Client-Side AES-256-GCM Active • Encrypted locally before saving</span>
          </div>
        </div>
      )}

      {/* 3. Optional Docs / Login URL */}
      <div>
        {!showMoreOptions && !url ? (
          <button
            type="button"
            style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}
            onClick={() => setShowMoreOptions(true)}
          >
            <Plus size={11} /> Add Documentation / Login URL (Optional)
          </button>
        ) : (
          <div>
            <label style={{ ...S.label, marginBottom: 3 }}>Documentation / Login URL (Optional)</label>
            <input
              style={{ ...S.input, padding: "7px 10px", fontSize: 12 }}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://platform.openai.com"
            />
          </div>
        )}
      </div>

      {/* Renewal Watchdog Collapsible Toggle (Hidden for notes / backup codes) */}
      {secretType !== "note" && (
        <div
          style={{
          marginTop: 2,
          background: "rgba(176,141,87,0.05)",
          border: `1px solid ${trackRenewal ? COLORS.brassDim : COLORS.line}`,
          borderRadius: 8,
          padding: "8px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => {
            if (currentPlan === "free") {
              onOpenUpgrade();
            } else {
              setTrackRenewal(!trackRenewal);
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.brass, fontSize: 11.5, fontWeight: 600 }}>
            <Bell size={13} />
            <span>Renewal Watchdog & Billing Tracker</span>
            {currentPlan === "free" && <span style={S.planBadge}>PRO</span>}
          </div>
          {currentPlan === "free" ? (
            <span style={{ fontSize: 10.5, color: COLORS.brass, display: "flex", alignItems: "center", gap: 3 }}>
              <Sparkles size={11} /> Unlock with Pro
            </span>
          ) : (
            <ToggleSwitch
              checked={trackRenewal}
              onChange={(val) => setTrackRenewal(val)}
            />
          )}
        </div>

        {trackRenewal && currentPlan !== "free" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
            {/* Intent Selector Mode */}
            <div>
              <div style={{ display: "flex", gap: 6, background: COLORS.panelAlt, padding: 3, borderRadius: 6, border: `1px solid ${COLORS.line}` }}>
                <button
                  type="button"
                  style={{
                    ...S.intentToggleBtn,
                    padding: "5px 8px",
                    fontSize: 11,
                    background: alertIntent === "review_cancel" ? "rgba(224,122,109,0.2)" : "transparent",
                    color: alertIntent === "review_cancel" ? "#FFA296" : COLORS.textDim,
                  }}
                  onClick={() => setAlertIntent("review_cancel")}
                >
                  <BellRing size={11} /> 🔔 Review / Cancel Alert
                </button>
                <button
                  type="button"
                  style={{
                    ...S.intentToggleBtn,
                    padding: "5px 8px",
                    fontSize: 11,
                    background: alertIntent === "permanent_auto" ? "rgba(143,169,140,0.2)" : "transparent",
                    color: alertIntent === "permanent_auto" ? "#8FA98C" : COLORS.textDim,
                  }}
                  onClick={() => setAlertIntent("permanent_auto")}
                >
                  <RefreshCw size={11} /> 🔄 Auto-Renew (Quiet)
                </button>
              </div>
            </div>

            {/* Row 1: Date + Frequency */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1.1 }}>
                <label style={{ ...S.label, fontSize: 10.5, marginBottom: 2 }}>Billing Date</label>
                <input
                  style={{ ...S.input, padding: "6px 8px", fontSize: 11.5 }}
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  required={trackRenewal}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...S.label, fontSize: 10.5, marginBottom: 2 }}>Cycle</label>
                <CustomDropdown
                  value={billingFrequency}
                  onChange={setBillingFrequency}
                  options={[
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly" },
                    { value: "one-time", label: "One-time / Trial" },
                  ]}
                  buttonStyle={{ padding: "6px 8px", fontSize: 11.5 }}
                />
              </div>
            </div>

            {/* Row 2: Currency & Cost + Reminder */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 75 }}>
                <label style={{ ...S.label, fontSize: 10.5, marginBottom: 2 }}>Currency</label>
                <CustomDropdown
                  value={currency}
                  onChange={setCurrency}
                  options={[
                    { value: "$", label: "$ USD" },
                    { value: "₹", label: "₹ INR" },
                    { value: "€", label: "€ EUR" },
                    { value: "£", label: "£ GBP" },
                  ]}
                  buttonStyle={{ padding: "6px 8px", fontSize: 11.5 }}
                />
              </div>
              <div style={{ flex: 1.1 }}>
                <label style={{ ...S.label, fontSize: 10.5, marginBottom: 2 }}>Estimated Cost</label>
                <input
                  style={{
                    ...S.input,
                    padding: "6px 8px",
                    fontSize: 11.5,
                    ...(costError ? { borderColor: COLORS.red } : {}),
                  }}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="20.00 or 1999"
                  value={cost}
                  onChange={handleCostChange}
                />
                {costError && (
                  <div style={{ fontSize: 10, color: "#FFA296", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <AlertTriangle size={11} /> {costError}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...S.label, fontSize: 10.5, marginBottom: 2 }}>Reminder</label>
                <CustomDropdown
                  value={reminderDays}
                  onChange={setReminderDays}
                  options={[
                    { value: "1", label: "1 Day Prior" },
                    { value: "3", label: "3 Days Prior" },
                    { value: "7", label: "1 Week Prior" },
                  ]}
                  buttonStyle={{ padding: "6px 8px", fontSize: 11.5 }}
                />
              </div>
            </div>

            {/* Row 3: Cancel Portal URL */}
            <div>
              <label style={{ ...S.label, fontSize: 10.5, marginBottom: 2 }}>Cancellation / Billing Portal URL</label>
              <input
                style={{ ...S.input, padding: "6px 8px", fontSize: 11.5 }}
                type="url"
                placeholder="https://platform.openai.com/account/billing"
                value={cancelUrl}
                onChange={(e) => setCancelUrl(e.target.value)}
              />
            </div>

            {isEdit && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panelAlt, padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.line}`, marginTop: 2 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: isCanceled ? "#8FA98C" : COLORS.text }}>
                    Mark subscription as stopped / canceled
                  </span>
                  <span style={{ fontSize: 10, color: COLORS.textFaint }}>
                    Logs price into savings tracker & disables renewal alarms
                  </span>
                </div>
                <ToggleSwitch
                  checked={isCanceled}
                  onChange={(val) => setIsCanceled(val)}
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      <button
        style={{ ...S.primaryBtn, padding: "9px 16px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: !label.trim() || (trackRenewal && !!costError) ? 0.6 : 1 }}
        disabled={!label.trim() || (trackRenewal && !!costError)}
        type="submit"
      >
        <ShieldCheck size={14} />
        {isEdit ? "Encrypt & Update Secret" : "Encrypt & Save Secret"}
      </button>
    </form>
  );
}

function UpgradePlansContent({ currentPlan, userId, userEmail, onSelectPlan }) {
  const [upgrading, setUpgrading] = useState(null);

  const plans = VAULT_PLANS;


  const [restoring, setRestoring] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState("");

  async function handleSelect(planId) {
    if (planId === currentPlan) return;
    setUpgrading(planId);
    setPaymentMsg("");

    if (planId === "free") {
      // Downgrade request
      await onSelectPlan(planId);
      setUpgrading(null);
      return;
    }

    if (isNative()) {
      // Native Android / iOS Google Play Billing via RevenueCat
      const res = await purchaseSubscriptionPackage(planId);
      if (res.success && res.plan) {
        await onSelectPlan(res.plan);
        setPaymentMsg(`Subscription activated: ${res.plan.toUpperCase()}`);
      } else if (res.userCancelled) {
        // User closed the Google Play payment sheet
      } else {
        // Fallback for development if native store products are not yet published
        await onSelectPlan(planId);
      }
    } else {
      // Web Browser: Lemon Squeezy Checkout
      const launched = openLemonCheckout(planId, userId, userEmail);
      if (!launched) {
        // If checkout URL is not yet configured in .env, fallback to direct activation for development testing
        await onSelectPlan(planId);
      }
    }
    setUpgrading(null);
  }

  async function handleRestore() {
    setRestoring(true);
    setPaymentMsg("");
    if (isNative()) {
      const res = await restoreNativePurchases();
      if (res.success && res.hasActiveSubscription && res.plan) {
        await onSelectPlan(res.plan);
        setPaymentMsg(`Purchases restored! Active plan: ${res.plan.toUpperCase()}`);
      } else {
        setPaymentMsg("No active Google Play subscriptions found to restore.");
      }
    } else {
      setPaymentMsg("Your account subscription status is up to date.");
    }
    setRestoring(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
        Upgrade your vault to remove limits, enable client handovers, and unlock powerful collaboration tools.
      </div>

      {paymentMsg && (
        <div style={{ ...S.infoBox, background: "rgba(148,110,55,0.1)", borderColor: COLORS.brass, color: COLORS.text }}>
          <Sparkles size={14} color={COLORS.brass} /> {paymentMsg}
        </div>
      )}

      <div style={S.planGrid}>
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              style={{
                ...S.pricingCard,
                ...(p.popular ? S.pricingCardPopular : {}),
                ...(isCurrent ? S.pricingCardCurrent : {}),
              }}
            >
              {p.popular && <div style={S.popularTag}>Most Popular</div>}
              <div>
                <div style={S.pricingTitle}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                  <span style={S.pricingPrice}>{p.price}</span>
                  <span style={S.pricingPeriod}>{p.period}</span>
                </div>
                <div style={{ ...S.pricingDesc, marginTop: 6 }}>{p.desc}</div>
              </div>

              <div style={S.featureList}>
                {p.features.map((feat, idx) => (
                  <div key={idx} style={S.featureItem}>
                    <CheckCircle2 size={13} color={p.popular ? COLORS.brass : COLORS.green} style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isCurrent || upgrading !== null}
                style={
                  isCurrent
                    ? { ...S.secondaryBtn, justifyContent: "center", cursor: "default", opacity: 0.8 }
                    : p.popular
                    ? { ...S.primaryBtn, marginTop: 8 }
                    : { ...S.secondaryBtn, justifyContent: "center", marginTop: 8, color: p.id === "free" ? "#E07A6D" : COLORS.text }
                }
                onClick={() => handleSelect(p.id)}
              >
                {upgrading === p.id
                  ? isNative() ? "Opening Google Play…" : "Opening Checkout…"
                  : isCurrent
                  ? "Current Plan"
                  : p.id === "free"
                  ? "Downgrade to Free"
                  : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Restore Purchases & Guarantee Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: COLORS.panelAlt, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}`, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} color={COLORS.brass} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, color: COLORS.textDim }}>
            {isNative()
              ? "🔒 Google Play In-App Billing (UPI, Cards, GPay). Cancel anytime in Play Store."
              : "🔒 Secure Checkout by Lemon Squeezy (Cards, UPI, PayPal, Apple & Google Pay)."}
          </div>
        </div>
        <button
          type="button"
          style={{ background: "none", border: "none", color: COLORS.brass, fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
          disabled={restoring}
          onClick={handleRestore}
        >
          {restoring ? "Checking store…" : "Restore Purchases"}
        </button>
      </div>
    </div>
  );
}




function ImportEnvContent({ projectId, onImport, onClose }) {
  const [text, setText] = useState("");
  const [targetEnv, setTargetEnv] = useState("global");
  const [busy, setBusy] = useState(false);

  function parseEnv(raw) {
    const lines = raw.split("\n");
    const parsed = [];
    for (let line of lines) {
      let trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      // Strip 'export ' if present
      if (trimmed.startsWith("export ")) {
        trimmed = trimmed.substring(7).trim();
      }
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let val = trimmed.slice(eqIndex + 1).trim();

      // Remove surrounding quotes if matching
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else {
        // Strip inline comments if unquoted (e.g. API_KEY=123 # dev key)
        const commentIndex = val.indexOf(" #");
        if (commentIndex !== -1) {
          val = val.slice(0, commentIndex).trim();
        }
      }
      if (key) {
        parsed.push({
          label: key,
          username: key,
          password: val,
          environment: targetEnv,
          url: "",
          notes: `Imported from .env file`,
        });
      }
    }
    return parsed;
  }

  const parsedItems = parseEnv(text);

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setText(evt.target.result || "");
    };
    reader.readAsText(file);
  }

  async function handleSave() {
    if (!parsedItems.length) return;
    setBusy(true);
    await onImport(projectId, parsedItems);
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.4 }}>
        Paste your raw <code style={{ color: COLORS.brass, fontFamily: "IBM Plex Mono, monospace" }}>.env</code> file content below or upload an existing file. Each key-value pair will be individually encrypted client-side.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: COLORS.textFaint, fontWeight: 600 }}>Assign Environment:</span>
        {[
          { id: "global", label: "Global" },
          { id: "prod", label: "🚀 Prod" },
          { id: "staging", label: "🧪 Staging" },
          { id: "dev", label: "💻 Dev" },
        ].map((e) => (
          <button
            key={e.id}
            type="button"
            style={{
              ...S.secondaryBtn,
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 12,
              background: targetEnv === e.id ? "rgba(176,141,87,0.2)" : "transparent",
              borderColor: targetEnv === e.id ? COLORS.brass : COLORS.line,
              color: targetEnv === e.id ? COLORS.brass : COLORS.textDim,
            }}
            onClick={() => setTargetEnv(e.id)}
          >
            {e.label}
          </button>
        ))}
      </div>

      <textarea
        style={{ ...S.textarea, minHeight: 120, maxHeight: 180, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        autoFocus
        placeholder={`# Example .env\nDATABASE_URL=postgresql://user:pass@host/db\nSTRIPE_SECRET_KEY=sk_live_123456\nNEXT_PUBLIC_APP_URL=https://app.com`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ ...S.secondaryBtn, cursor: "pointer", fontSize: 12 }}>
          <Upload size={13} /> Choose .env file
          <input type="file" accept=".env,.env.*,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
        </label>
        <span style={{ fontSize: 12, color: parsedItems.length ? COLORS.green : COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
          {parsedItems.length ? `✓ ${parsedItems.length} variables detected (${targetEnv.toUpperCase()})` : "0 variables detected"}
        </span>
      </div>

      <button
        style={S.primaryBtn}
        disabled={!parsedItems.length || busy}
        onClick={handleSave}
      >
        {busy ? "Encrypting & saving…" : `Import & Encrypt ${parsedItems.length} Secrets`}
      </button>
    </div>
  );
}

function ExportEnvContent({ project, onClose, showSuccess }) {
  const [mode, setMode] = useState("skeleton"); // skeleton | full
  const [copied, setCopied] = useState(false);

  const creds = project.credentials || [];

  const skeletonText = creds
    .map((c) => `${c.label}=your_${c.label.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_here`)
    .join("\n");

  const fullText = creds
    .map((c) => `${c.label}=${c.password || c.username || ""}`)
    .join("\n");

  const displayText = mode === "skeleton" ? skeletonText : fullText;

  function handleCopy() {
    navigator.clipboard.writeText(displayText).catch(() => {});
    setCopied(true);
    showSuccess(mode === "skeleton" ? "Copied Skeleton .env.example" : "Copied Full Decrypted .env");
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const filename = mode === "skeleton" ? ".env.example" : ".env";
    const blob = new Blob([displayText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(`Downloaded ${filename}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, background: COLORS.panelAlt, padding: 4, borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
        <button
          type="button"
          style={{
            flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
            background: mode === "skeleton" ? "rgba(176,141,87,0.2)" : "transparent",
            color: mode === "skeleton" ? COLORS.brass : COLORS.textDim,
          }}
          onClick={() => setMode("skeleton")}
        >
          Skeleton .env.example (Safe for Team)
        </button>
        <button
          type="button"
          style={{
            flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
            background: mode === "full" ? "rgba(192,107,95,0.2)" : "transparent",
            color: mode === "full" ? "#E07A6D" : COLORS.textDim,
          }}
          onClick={() => setMode("full")}
        >
          Full Decrypted .env (Secrets)
        </button>
      </div>

      {mode === "skeleton" ? (
        <div style={{ ...S.infoBox, fontSize: 11.5 }}>
          <ShieldCheck size={14} style={{ flexShrink: 0 }} />
          <span><strong>Safe Mode:</strong> Real production secret values are stripped. Safe to commit or share with developers so they know which keys to configure locally.</span>
        </div>
      ) : (
        <div style={{ ...S.errBox, fontSize: 11.5 }}>
          <ShieldAlert size={14} style={{ flexShrink: 0 }} />
          <span><strong>Caution:</strong> Contains live unencrypted production secrets. Never share or commit this to public repositories.</span>
        </div>
      )}

      <pre style={S.codeBox}>
        {displayText || "# No credentials in this project."}
      </pre>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={{ ...S.primaryBtn, flex: 1, marginTop: 0 }} onClick={handleCopy} disabled={!creds.length}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <button type="button" style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center" }} onClick={handleDownload} disabled={!creds.length}>
          <Download size={14} /> Download {mode === "skeleton" ? ".env.example" : ".env"}
        </button>
      </div>
    </div>
  );
}

function TeamMembersContent({ client, userId, onClose, showSuccess }) {
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteRows, setInviteRows] = useState([
    { id: 1, email: "", role: "restricted" },
  ]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // 1. Fetch active members & profiles
      const { data: memberRows } = await supabase.from("client_members").select("*").eq("client_id", client.id);
      
      let enrichedMembers = [];
      if (memberRows && memberRows.length > 0) {
        const userIds = memberRows.map((m) => m.user_id);
        const { data: profileRows } = await supabase.from("profiles").select("id, email").in("id", userIds);
        const profileMap = {};
        (profileRows || []).forEach((p) => { profileMap[p.id] = p.email; });

        enrichedMembers = memberRows.map((m) => ({
          ...m,
          email: profileMap[m.user_id] || `${m.user_id.slice(0, 8)}…`,
        }));
      }
      setMembers(enrichedMembers);

      // 2. Fetch pending invites
      const { data: inviteRowsData } = await supabase.from("client_invites").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
      setPendingInvites(inviteRowsData || []);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }, [client.id]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateRow(id, field, value) {
    setInviteRows((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      const lastRow = updated[updated.length - 1];
      if (lastRow && lastRow.email.trim().length > 0 && field === "email") {
        return [...updated, { id: Date.now(), email: "", role: "restricted" }];
      }
      return updated;
    });
  }

  function removeRow(id) {
    setInviteRows((prev) => {
      if (prev.length <= 1) {
        return [{ id: Date.now(), email: "", role: "restricted" }];
      }
      return prev.filter((r) => r.id !== id);
    });
  }

  function addEmptyRow() {
    setInviteRows((prev) => [...prev, { id: Date.now(), email: "", role: "restricted" }]);
  }

  const validRows = inviteRows.filter((r) => r.email.trim().length > 0);

  async function handleSendInvites(e) {
    e?.preventDefault();
    if (!validRows.length) return;
    setBusy(true);
    setErr("");
    try {
      for (const row of validRows) {
        try {
          await supabase.from("client_invites").upsert({
            client_id: client.id,
            inviter_id: userId,
            email: row.email.trim().toLowerCase(),
            role: row.role,
          }, { onConflict: "client_id,email" });
        } catch {}
      }
      showSuccess(
        validRows.length === 1
          ? `Invite sent to ${validRows[0].email}`
          : `Sent ${validRows.length} team invitations successfully!`
      );
      setInviteRows([{ id: Date.now(), email: "", role: "restricted" }]);
      loadData();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function handleResendInvite(inv) {
    showSuccess(`Invitation resent to ${inv.email}`);
  }

  async function handleRevokeInvite(inviteId, email) {
    try {
      await supabase.from("client_invites").delete().eq("id", inviteId);
      showSuccess(`Revoked invitation for ${email}`);
      loadData();
    } catch (e) {
      setErr(e.message);
    }
  }

  function handleCopyInviteLink(inv) {
    const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(inv.email)}&client=${client.id}`;
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
    showSuccess(`Copied invite link for ${inv.email}`);
  }

  async function handleRemoveMember(memberUserId) {
    try {
      await supabase.from("client_members").delete().eq("client_id", client.id).eq("user_id", memberUserId);
      showSuccess("Member removed from vault");
      loadData();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 12.5, color: COLORS.textDim, lineHeight: 1.4 }}>
        Manage team access for <strong>{client.name}</strong>. Track who has logged in, view pending invites, and assign Full vs <strong>Restricted (Skeleton-Only)</strong> roles.
      </div>

      <form onSubmit={handleSendInvites} style={{ display: "flex", flexDirection: "column", gap: 10, background: COLORS.panelAlt, padding: 14, borderRadius: 10, border: `1px solid ${COLORS.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>INVITE TEAM MEMBERS</span>
          <span style={{ fontSize: 11, color: COLORS.brass, fontFamily: "IBM Plex Mono, monospace" }}>
            {validRows.length} ready to invite
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inviteRows.map((row, idx) => (
            <div key={row.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                style={{ ...S.input, flex: "1 1 180px", padding: "8px 10px" }}
                type="email"
                placeholder={idx === 0 ? "colleague@company.com" : "another.colleague@company.com"}
                value={row.email}
                onChange={(e) => updateRow(row.id, "email", e.target.value)}
              />
              <div style={{ display: "flex", gap: 6, flex: "1 1 180px", alignItems: "center" }}>
                <CustomDropdown
                  value={row.role}
                  onChange={(newRole) => updateRow(row.id, "role", newRole)}
                  options={[
                    { value: "restricted", label: "Restricted (Skeleton Only)" },
                    { value: "member", label: "Member (Full Access)" },
                  ]}
                  style={{ flex: 1 }}
                />
                {inviteRows.length > 1 && (
                  <button
                    type="button"
                    style={{ ...S.iconBtnGhost, padding: 6, flexShrink: 0 }}
                    onClick={() => removeRow(row.id)}
                    title="Remove this invite row"
                  >
                    <X size={14} color={COLORS.red} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Role Explanation Callout for Skeleton Only */}
        <div style={{ fontSize: 11, color: COLORS.textDim, background: "var(--highlight-bg, rgba(148,110,55,0.06))", padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.line}`, lineHeight: 1.5 }}>
          <strong style={{ color: COLORS.text }}>Role Permissions Guide:</strong>
          <br />• <strong>Restricted (Skeleton Only):</strong> Contractors & junior devs see variable keys (e.g. <code>STRIPE_KEY=your_key_here</code>) to configure local environments, but real production secrets remain hidden.
          <br />• <strong>Member (Full Access):</strong> Trusted engineers can view decrypted secrets and export live .env files.
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            style={{ ...S.secondaryBtn, fontSize: 11.5, padding: "6px 10px" }}
            onClick={addEmptyRow}
          >
            <Plus size={12} /> Add another team member
          </button>

          <button
            type="submit"
            style={{ ...S.primaryBtnSm, padding: "7px 16px" }}
            disabled={busy || !validRows.length}
          >
            <UserPlus size={13} /> {busy ? "Sending…" : `Send ${validRows.length ? `(${validRows.length})` : ""} Invites`}
          </button>
        </div>
      </form>

      {/* 🟢 ACTIVE LOGGED-IN MEMBERS */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
            ACTIVE MEMBERS ({members.length + 1})
          </span>
          <span style={S.activeBadge}>
            <CheckCircle2 size={11} /> Logged In & Active
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={S.memberRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ ...S.dialRing, width: 28, height: 28 }}>
                <Crown size={14} color="#B08D57" />
              </div>
              <div>
                <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Vault Owner (You)</div>
                <div style={{ fontSize: 11, color: "#8FA98C" }}>🟢 Active Now • Team Lead</div>
              </div>
            </div>
            <span style={S.rolePillOwner}>OWNER</span>
          </div>

          {members.map((m) => (
            <div key={m.user_id} style={S.memberRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ ...S.dialRing, width: 28, height: 28 }}>
                  <User size={14} color="#8FA98C" />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{m.email}</div>
                  <div style={{ fontSize: 11, color: "#8FA98C" }}>
                    🟢 Joined & Logged In {m.added_at ? `• ${new Date(m.added_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={m.role === "restricted" ? S.rolePillRestricted : S.rolePillMember}>
                  {m.role === "restricted" ? "SKELETON ONLY" : "FULL ACCESS"}
                </span>
                <button style={S.iconBtnGhost} onClick={() => handleRemoveMember(m.user_id)} title="Remove member">
                  <Trash2 size={13} color={COLORS.red} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🟡 PENDING INVITATIONS (NOT LOGGED IN YET) */}
      {pendingInvites.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>
              PENDING INVITATIONS ({pendingInvites.length})
            </span>
            <span style={S.pendingBadge}>
              <Clock size={11} /> Waiting for Signup / Login
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendingInvites.map((inv) => (
              <div key={inv.id} style={{ ...S.memberRow, background: "rgba(176,141,87,0.04)", borderColor: "rgba(176,141,87,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ ...S.dialRing, width: 28, height: 28 }}>
                    <Clock size={13} color="#E0B77D" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: "#E0B77D" }}>
                      🟡 Invited • Awaiting first login
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={inv.role === "restricted" ? S.rolePillRestricted : S.rolePillMember}>
                    {inv.role === "restricted" ? "SKELETON" : "FULL"}
                  </span>
                  <button
                    type="button"
                    style={{ ...S.secondaryBtn, padding: "4px 8px", fontSize: 11 }}
                    onClick={() => handleCopyInviteLink(inv)}
                    title="Copy direct invite link"
                  >
                    <Copy size={11} /> Copy Link
                  </button>
                  <button
                    type="button"
                    style={{ ...S.secondaryBtn, padding: "4px 8px", fontSize: 11 }}
                    onClick={() => handleResendInvite(inv)}
                    title="Resend invitation email"
                  >
                    <RotateCcw size={11} /> Resend
                  </button>
                  <button
                    type="button"
                    style={{ ...S.iconBtnGhost, padding: 4 }}
                    onClick={() => handleRevokeInvite(inv.id, inv.email)}
                    title="Revoke invitation"
                  >
                    <X size={13} color={COLORS.red} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function SecurityHealthAuditModalContent({ project, onClose }) {
  const creds = project.credentials || [];
  const health = calculateSecurityHealth(creds);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          ...S.healthMeterCard,
          border: `1px solid ${health.score >= 85 ? "#8FA98C40" : "#E07A6D40"}`,
          background: health.score >= 85 ? "rgba(143,169,140,0.08)" : "rgba(224,122,109,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textFaint, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              VAULT SECURITY RATING
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: health.score >= 85 ? "#8FA98C" : "#E07A6D", fontFamily: "IBM Plex Mono, monospace" }}>
              {health.score} <span style={{ fontSize: 15, color: COLORS.textFaint }}>/ 100</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={health.score >= 85 ? S.healthBadgeGood : S.healthBadgeWarning}>
              <ShieldCheck size={13} /> {health.score >= 85 ? "Good Security Posture" : "Security Alerts Flagged"}
            </span>
          </div>
        </div>

        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
          <div
            style={{
              width: `${health.score}%`,
              height: "100%",
              background: health.score >= 85 ? "#8FA98C" : "#E07A6D",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Diagnostic Findings ({health.warnings.length})
        </div>

        {health.warnings.length === 0 ? (
          <div style={{ ...S.infoBox, background: "rgba(143,169,140,0.1)", borderColor: "#8FA98C40", color: "#C0D6BD" }}>
            <CheckCircle2 size={16} color="#8FA98C" style={{ flexShrink: 0 }} />
            <span>
              <strong>All checks passed:</strong> No dummy placeholder strings or weak secrets found in this project.
            </span>
          </div>
        ) : (
          health.warnings.map((w, idx) => (
            <div key={idx} style={{ ...S.errBox, padding: "8px 12px", fontSize: 12 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{typeof w === "string" ? w : w.msg || String(w)}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        <div style={{ ...S.watchdogStatCard, padding: "8px 10px" }}>
          <span style={S.watchdogStatLabel}>Total Secrets Audited</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>{health.stats?.total ?? creds.length} Keys</span>
        </div>
        <div style={{ ...S.watchdogStatCard, padding: "8px 10px" }}>
          <span style={S.watchdogStatLabel}>Production Scoped</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.brass }}>{health.stats?.productionCount ?? 0} Live Secrets</span>
        </div>
      </div>

      <button style={S.secondaryBtn} onClick={onClose}>
        Close Audit Report
      </button>
    </div>
  );
}

function HandoverPackageContent({ project, clientName, onClose, showSuccess }) {
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState(false);

  const creds = project.credentials || [];
  const details = project.details || {};
  const checklist = details.checklist || [];
  const attachments = details.attachments || [];
  const completedTasks = checklist.filter((t) => t.completed);

  const attachmentsText = attachments.length
    ? attachments.map((a) => `- ${a.type === "file" ? "📄" : "🔗"} ${a.name} (${a.type === "file" ? "Attached File" : a.url})`).join("\n")
    : "- No external PRD/SOP documents attached.";

  const handoverMarkdown = `# 📦 CLIENT HANDOVER PACKAGE: ${project.name.toUpperCase()}
Client: ${clientName}
Date of Delivery: ${new Date().toLocaleDateString()}
Status: Complete & Production Ready

---

## 1. Project Overview & Deadlines
- Client Submission Deadline: ${details.lastDate ? new Date(details.lastDate).toLocaleDateString() : "Delivered"}
- Deliverables Completed: ${completedTasks.length} / ${checklist.length} Milestones
${details.notes ? `\n### Project Notes & Staging Specs:\n${details.notes}\n` : ""}

## 2. Deliverables Completed Checklist
${checklist.map((item) => `- [${item.completed ? "x" : " "}] ${item.text}`).join("\n") || "- All deliverables confirmed and tested."}

---

## 3. Production Environment & API Credentials (.env)
\`\`\`bash
${creds.map((c) => `# ${c.label} (${(c.environment || "global").toUpperCase()})${c.url ? ` - Docs: ${c.url}` : ""}\n${c.username || c.label}=${c.password || ""}`).join("\n\n") || "# No credentials recorded."}
\`\`\`

---

## 4. Pinned PRDs, Architecture SOPs & Reference Documents
${attachmentsText}

---
*Generated securely via Custodian Zero-Knowledge Vault.*
`;

  function handleCopy() {
    navigator.clipboard.writeText(handoverMarkdown).catch(() => {});
    setCopied(true);
    showSuccess("Copied Client Handover Document!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_client_handover.md`;
    const blob = new Blob([handoverMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(`Downloaded ${filename}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...S.infoBox, fontSize: 12 }}>
        <Sparkles size={16} color="#B08D57" style={{ flexShrink: 0 }} />
        <span>
          <strong>Client Handover Ready:</strong> Deliverables checklist, specification notes, and production secrets are packaged into an executive document to deliver to your client.
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, background: COLORS.panelAlt, padding: 4, borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
        <button
          type="button"
          style={{
            flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
            background: activeTab === "preview" ? "rgba(176,141,87,0.2)" : "transparent",
            color: activeTab === "preview" ? COLORS.brass : COLORS.textDim,
          }}
          onClick={() => setActiveTab("preview")}
        >
          Executive Summary
        </button>
        <button
          type="button"
          style={{
            flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
            background: activeTab === "raw_md" ? "rgba(176,141,87,0.2)" : "transparent",
            color: activeTab === "raw_md" ? COLORS.brass : COLORS.textDim,
          }}
          onClick={() => setActiveTab("raw_md")}
        >
          Formatted Markdown & .env
        </button>
      </div>

      {activeTab === "preview" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{project.name}</div>
              <div style={{ fontSize: 11.5, color: COLORS.textDim }}>Client: {clientName}</div>
            </div>
            <span style={S.savingsBadge}>
              <CheckCircle2 size={12} /> Ready for Handoff
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <div style={{ ...S.watchdogStatCard, padding: "10px 12px" }}>
              <span style={S.watchdogStatLabel}>Deliverables Completed</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#8FA98C" }}>
                {completedTasks.length} / {checklist.length} Tasks
              </span>
            </div>
            <div style={{ ...S.watchdogStatCard, padding: "10px 12px" }}>
              <span style={S.watchdogStatLabel}>Production Secrets</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.brass }}>
                {creds.length} Keys Packaged
              </span>
            </div>
          </div>
        </div>
      ) : (
        <pre style={{ ...S.codeBox, maxHeight: 240, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{handoverMarkdown}</pre>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={{ ...S.primaryBtn, flex: "1 1 160px", marginTop: 0 }} onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied Handover Document!" : "Copy Client Handover"}
        </button>
        <button type="button" style={{ ...S.secondaryBtn, flex: "1 1 160px", justifyContent: "center" }} onClick={handleDownload}>
          <Download size={14} /> Download .md Package
        </button>
      </div>
    </div>
  );
}

function ProjectReadinessAuditModalContent({ project, allRenewals = [], onClose }) {
  const readiness = calculateProjectReadiness(project, allRenewals);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Top Score Banner */}
      <div
        style={{
          background: COLORS.panelAlt,
          border: `1px solid ${readiness.score >= 85 ? "rgba(143,169,140,0.3)" : "rgba(176,141,87,0.3)"}`,
          borderRadius: 10,
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Operational Readiness Score
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: readiness.score >= 85 ? "#8FA98C" : readiness.score >= 60 ? COLORS.brass : "#E07A6D", marginTop: 2 }}>
            {readiness.score}% {readiness.status === "production_ready" ? "Production Ready" : readiness.status === "in_progress" ? "In Progress" : "Needs Attention"}
          </div>
        </div>

        <div style={{ width: 120, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${readiness.score}%`,
              background: readiness.score >= 85 ? "#8FA98C" : readiness.score >= 60 ? COLORS.brass : "#E07A6D",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Issues / Recommendations Alert */}
      {readiness.issues.length > 0 && (
        <div style={{ background: "rgba(217,130,43,0.08)", border: "1px solid rgba(217,130,43,0.3)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F0A24A", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> Actionable Recommendations:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: COLORS.textDim, display: "flex", flexDirection: "column", gap: 4 }}>
            {readiness.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Criteria Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Evaluation Checklist</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {readiness.checks.map((c, i) => (
            <div
              key={i}
              style={{
                background: COLORS.panelAlt,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 6,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {c.passed ? <CheckCircle2 size={14} color="#8FA98C" /> : <AlertTriangle size={14} color="#D9822B" />}
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{c.name}</span>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>{c.detail}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: c.passed ? "#8FA98C" : COLORS.textDim, fontWeight: 600 }}>
                +{c.awarded}/{c.weight} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      <button style={S.secondaryBtn} onClick={onClose}>
        Close Readiness Report
      </button>
    </div>
  );
}

function EditDeploymentContent({ project, onSave }) {
  const details = project.details || {};
  const current = details.deployment || {};

  const [repository, setRepository] = useState(current.repository || details.repoUrl || "");
  const [branch, setBranch] = useState(current.branch || "main");
  const [platform, setPlatform] = useState(current.platform || "Vercel");
  const [productionUrl, setProductionUrl] = useState(current.productionUrl || details.productionUrl || "");
  const [stagingUrl, setStagingUrl] = useState(current.stagingUrl || details.stagingUrl || "");
  const [buildCommand, setBuildCommand] = useState(current.buildCommand || "npm run build");
  const [deployCommand, setDeployCommand] = useState(current.deployCommand || "git push origin main");
  const [rollbackNotes, setRollbackNotes] = useState(current.rollbackNotes || "");

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSave({
      repository: repository.trim(),
      branch: branch.trim(),
      platform,
      productionUrl: productionUrl.trim(),
      stagingUrl: stagingUrl.trim(),
      buildCommand: buildCommand.trim(),
      deployCommand: deployCommand.trim(),
      rollbackNotes: rollbackNotes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Git Repository URL</label>
          <input
            style={S.input}
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            placeholder="https://github.com/org/repo"
          />
        </div>
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Default Deploy Branch</label>
          <input
            style={S.input}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main or production"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Hosting Platform</label>
          <CustomDropdown
            value={platform}
            onChange={setPlatform}
            options={[
              "Vercel",
              "AWS Amplify / ECS",
              "Render",
              "Railway",
              "Netlify",
              "Fly.io",
              "DigitalOcean App Platform",
              "Custom Docker / VPS",
            ]}
          />
        </div>
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Production URL</label>
          <input
            style={S.input}
            type="url"
            value={productionUrl}
            onChange={(e) => setProductionUrl(e.target.value)}
            placeholder="https://app.domain.com"
          />
        </div>
      </div>

      <div>
        <label style={{ ...S.label, marginBottom: 4 }}>Staging / Preview URL</label>
        <input
          style={S.input}
          type="url"
          value={stagingUrl}
          onChange={(e) => setStagingUrl(e.target.value)}
          placeholder="https://staging.domain.com"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Build Command</label>
          <input
            style={{ ...S.input, fontFamily: "monospace", fontSize: 12 }}
            value={buildCommand}
            onChange={(e) => setBuildCommand(e.target.value)}
            placeholder="npm run build"
          />
        </div>
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Deploy Command</label>
          <input
            style={{ ...S.input, fontFamily: "monospace", fontSize: 12 }}
            value={deployCommand}
            onChange={(e) => setDeployCommand(e.target.value)}
            placeholder="git push origin main"
          />
        </div>
      </div>

      <div>
        <label style={{ ...S.label, marginBottom: 4 }}>Rollback & Emergency Procedure</label>
        <textarea
          style={{ ...S.input, height: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          value={rollbackNotes}
          onChange={(e) => setRollbackNotes(e.target.value)}
          placeholder="e.g. In case of failure: revert commit in GitHub, redeploy Vercel instant rollback build #..."
        />
      </div>

      <button style={S.primaryBtn} type="submit">
        Save Deployment Runbook
      </button>
    </form>
  );
}

function ShareSecretModalContent({ userId, ecdhPrivateKey, initialCred, onClose, showSuccess }) {
  const [recipientQuery, setRecipientQuery] = useState("");
  const [matchingUsers, setMatchingUsers] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [title, setTitle] = useState(initialCred?.title || "");
  const [category, setCategory] = useState(initialCred?.category || "API KEY");
  const [fields, setFields] = useState(initialCred?.fields || [{ key: "API_SECRET", value: "" }]);
  const [note, setNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [err, setErr] = useState("");

  const searchUsers = useCallback(async (q) => {
    const clean = q.trim().toLowerCase().replace(/^@/, "");
    if (!clean || clean.length < 2) {
      setMatchingUsers([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, username, display_name, public_key")
        .neq("id", userId)
        .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        .limit(6);

      if (error) throw error;
      setMatchingUsers(data || []);
    } catch (e) {
      console.warn("[ShareSecretModal] Search error:", e);
    } finally {
      setSearching(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipientQuery && !selectedRecipient) {
        searchUsers(recipientQuery);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [recipientQuery, selectedRecipient, searchUsers]);

  function handleAddField() {
    setFields([...fields, { key: "", value: "" }]);
  }

  function handleRemoveField(idx) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  function handleFieldChange(idx, fieldKey, val) {
    const next = [...fields];
    next[idx] = { ...next[idx], [fieldKey]: val };
    setFields(next);
  }

  async function handleShareSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!selectedRecipient) return setErr("Please search and select a recipient.");
    if (!selectedRecipient.public_key) {
      return setErr(
        `@${selectedRecipient.username || "recipient"} hasn't initialized their vault key yet. Ask them to log in to Custodian first.`
      );
    }
    if (!title.trim()) return setErr("Please enter a title for the shared secret.");
    if (fields.length === 0 || fields.every((f) => !f.value.trim())) {
      return setErr("Please provide at least one secret value.");
    }
    if (!ecdhPrivateKey) {
      return setErr("Your asymmetric private key was not found. Please lock and re-unlock your vault.");
    }

    setSharing(true);
    try {
      // 1. Prepare secret payload
      const payloadObj = {
        title: title.trim(),
        category,
        fields: fields.filter((f) => f.value.trim()),
        note: note.trim(),
        sharedAt: new Date().toISOString(),
      };

      // 2. Encrypt payload client-side via ECDH P-256 derived shared key
      const encryptedRes = await shareSecret(payloadObj, selectedRecipient.public_key, ecdhPrivateKey);
      const cipherString = JSON.stringify(encryptedRes);

      // 3. Get sender's public key
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", userId)
        .single();

      if (!myProfile?.public_key) {
        throw new Error("Sender public key not found. Please re-lock your vault to refresh keys.");
      }

      // 4. Save to shared_secrets table (supporting both secret_ciphertext and encrypted_payload columns)
      const { error: insertErr } = await supabase.from("shared_secrets").insert({
        sender_id: userId,
        recipient_id: selectedRecipient.id,
        title: title.trim(),
        category,
        encrypted_payload: cipherString,
        secret_ciphertext: cipherString,
        sender_public_key: myProfile.public_key,
        sender_public_key_snapshot: myProfile.public_key,
      });

      if (insertErr) throw insertErr;

      showSuccess(`Secret securely shared with @${selectedRecipient.username || selectedRecipient.display_name}!`);
      onClose();
    } catch (sErr) {
      console.error("[ShareSecretModal] Share error:", sErr);
      setErr(sErr.message || "Failed to encrypt and share secret.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <form onSubmit={handleShareSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {err && (
        <div style={S.errBox}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {/* Recipient Search & Selector */}
      <div>
        <label style={S.label}>Recipient (@username or Display Name)</label>
        {selectedRecipient ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(176,141,87,0.12)",
              border: `1px solid ${COLORS.brassBorder}`,
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <div>
              <strong style={{ color: COLORS.text, fontSize: 13 }}>
                {selectedRecipient.display_name || selectedRecipient.username}
              </strong>
              <span style={{ color: COLORS.brass, fontSize: 12, marginLeft: 6 }}>
                @{selectedRecipient.username || "user"}
              </span>
              {selectedRecipient.public_key && (
                <span style={{ fontSize: 10, color: "#52B788", marginLeft: 8 }}>✓ P-256 Ready</span>
              )}
            </div>
            <button
              type="button"
              style={{ ...S.iconBtn, color: COLORS.textFaint }}
              onClick={() => {
                setSelectedRecipient(null);
                setRecipientQuery("");
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              style={S.input}
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              placeholder="Search by @username (e.g. @alex_dev)..."
              autoFocus
            />
            {searching && (
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: COLORS.textFaint }}>
                Searching…
              </span>
            )}
            {matchingUsers.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  marginTop: 4,
                  background: COLORS.cardBg,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  maxHeight: 180,
                  overflowY: "auto",
                  zIndex: 20,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {matchingUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${COLORS.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onClick={() => {
                      setSelectedRecipient(u);
                      setMatchingUsers([]);
                    }}
                  >
                    <div>
                      <strong style={{ color: COLORS.text, fontSize: 13 }}>
                        {u.display_name || u.username}
                      </strong>
                      <span style={{ color: COLORS.brass, fontSize: 12, marginLeft: 6 }}>
                        @{u.username || "user"}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: u.public_key ? "#52B788" : COLORS.textFaint }}>
                      {u.public_key ? "ECDH Ready" : "Vault locked"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Secret Title & Category */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <div>
          <label style={S.label}>Secret Title</label>
          <input
            style={S.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Production Stripe API Key"
            required
          />
        </div>
        <div>
          <label style={S.label}>Category</label>
          <select
            style={{ ...S.input, cursor: "pointer" }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="API KEY">API KEY</option>
            <option value="DATABASE">DATABASE</option>
            <option value="STRIPE">STRIPE</option>
            <option value="SUPABASE">SUPABASE</option>
            <option value="AWS">AWS</option>
            <option value="SSH">SSH</option>
            <option value="ENV VAR">ENV VAR</option>
            <option value="PASSWORD">PASSWORD</option>
          </select>
        </div>
      </div>

      {/* Dynamic Key/Value Fields */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ ...S.label, margin: 0 }}>Secret Fields</label>
          <button
            type="button"
            style={{ ...S.secondaryBtn, padding: "2px 8px", fontSize: 11 }}
            onClick={handleAddField}
          >
            + Add Field
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fields.map((f, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 6, alignItems: "center" }}>
              <input
                style={{ ...S.input, fontSize: 12, fontFamily: "monospace" }}
                value={f.key}
                onChange={(e) => handleFieldChange(idx, "key", e.target.value)}
                placeholder="Field name (e.g. SECRET_KEY)"
              />
              <input
                style={{ ...S.input, fontSize: 12, fontFamily: "monospace" }}
                value={f.value}
                onChange={(e) => handleFieldChange(idx, "value", e.target.value)}
                placeholder="Secret value"
                required
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  style={{ ...S.iconBtn, color: COLORS.textFaint }}
                  onClick={() => handleRemoveField(idx)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional Note */}
      <div>
        <label style={S.label}>Optional Note (Included in encrypted payload)</label>
        <textarea
          style={{ ...S.input, height: 50, resize: "vertical", fontSize: 12 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Valid for the next 30 days. Don't share with external clients."
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button type="button" style={{ ...S.secondaryBtn, flex: 1 }} onClick={onClose} disabled={sharing}>
          Cancel
        </button>
        <button type="submit" style={{ ...S.primaryBtn, flex: 2 }} disabled={sharing}>
          {sharing ? "Encrypting with ECDH P-256…" : "🔒 Encrypt & Share Secret"}
        </button>
      </div>
    </form>
  );
}

function GhostClientModalContent({ client, onGhost, onMoveToTrash, onClose }) {
  const [reasonNotes, setReasonNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const projects = client?.projects || [];
  const totalSecrets = projects.reduce((acc, p) => acc + (p.credentials?.length || 0), 0);

  const handleGhostSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onGhost(client, reasonNotes);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleGhostSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
        Archive and compress this workspace if the client cancelled or paused their project. All project secrets, <code style={{ color: COLORS.brass }}>.env</code> files, and contract checklists are compiled into a secure <code style={{ color: COLORS.brass }}>.zip</code> package.
      </div>

      {/* Metrics overview */}
      <div style={{ display: "flex", gap: 10, background: COLORS.panelAlt, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>PROJECTS</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{projects.length}</div>
        </div>
        <div style={{ width: 1, background: COLORS.line }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>ENCRYPTED SECRETS</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{totalSecrets}</div>
        </div>
        <div style={{ width: 1, background: COLORS.line }} />
        <div style={{ flex: 1.2 }}>
          <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace" }}>VAULT TARGET</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brass, display: "flex", alignItems: "center", gap: 4 }}>
            <Ghost size={12} /> Ghosted Vault
          </div>
        </div>
      </div>

      {/* Reason textarea */}
      <div>
        <label style={S.label}>Cancellation / Ghosting Notes (Saved with Archive)</label>
        <textarea
          style={{ ...S.input, height: 75, resize: "vertical", fontSize: 12.5 }}
          value={reasonNotes}
          onChange={(e) => setReasonNotes(e.target.value)}
          placeholder="e.g. Client paused budget until Q2; Ghosted after delivering milestone 2; Mutual contract cancellation..."
        />
        <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 4 }}>
          Included in the archive's <code>CLIENT_SUMMARY.md</code> and preserved in your Ghosted Clients Vault.
        </div>
      </div>

      {/* Feature highlights callout */}
      <div style={{ background: "rgba(176,141,87,0.06)", border: `1px solid ${COLORS.brassDim}`, borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: COLORS.textDim, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: COLORS.brass, marginBottom: 2 }}>What happens when you archive:</div>
        <div>✓ Automatically downloads <code>{client.name?.replace(/[^a-zA-Z0-9_-]/g, "_")}-Archive.zip</code> with all <code>.env</code> configs.</div>
        <div>✓ Moves client out of active workspace view into your <strong>Ghosted Clients Vault</strong>.</div>
        <div>✓ When the client returns, restore their entire workspace in <strong>1 click</strong> with all secrets intact.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        <button
          type="submit"
          style={{ ...S.primaryBtn, justifyContent: "center", padding: "10px 16px" }}
          disabled={busy}
        >
          <Ghost size={15} /> {busy ? "Packaging & Downloading ZIP…" : "👻 Archive, Download ZIP & Ghost Client"}
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{ ...S.secondaryBtn, flex: 1, justifyContent: "center", fontSize: 11.5 }}
            onClick={() => onMoveToTrash(client.id)}
            disabled={busy}
          >
            <Trash2 size={12} /> Move to 30-Day Recycle Bin
          </button>
          <button
            type="button"
            style={{ ...S.iconBtnGhost, flex: "0 0 auto", padding: "6px 14px", fontSize: 11.5 }}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function ClientDeleteFreeModalContent({ client, onOpenUpgrade, onMoveToTrash, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
        Choose how you would like to handle deleting <strong>{client.name}</strong>.
      </div>

      {/* Pro / Team spotlight */}
      <div style={{ background: "rgba(176,141,87,0.08)", border: `1px solid ${COLORS.brassDim}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.brass, fontWeight: 700, fontSize: 13 }}>
          <Crown size={15} /> Did this client cancel or ghost their project?
        </div>
        <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
          With <strong>Custodian Pro or Team</strong>, you never lose project data. Automatically package client secrets, <code style={{ color: COLORS.brass }}>.env</code> files, and contract specs into a compressed <code style={{ color: COLORS.brass }}>.zip</code> archive, stored in your Ghosted Vault for instant 1-click reactivation when they return.
        </div>
        <button
          type="button"
          style={{ ...S.primaryBtnSm, alignSelf: "flex-start", marginTop: 4 }}
          onClick={() => {
            onClose();
            onOpenUpgrade();
          }}
        >
          <Sparkles size={13} /> Upgrade to Pro / Team
        </button>
      </div>

      {/* Free option */}
      <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>
          Standard Recycle Bin (Free Plan)
        </div>
        <div style={{ fontSize: 11.5, color: COLORS.textFaint, lineHeight: 1.4, marginBottom: 10 }}>
          Moves <strong>{client.name}</strong> and its projects to the Recycle Bin. You can restore it within 30 days before it is permanently purged.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{ ...S.dangerBtn, padding: "7px 14px", fontSize: 12 }}
            onClick={() => onMoveToTrash(client.id)}
          >
            <Trash2 size={13} /> Move to Recycle Bin
          </button>
          <button
            type="button"
            style={{ ...S.secondaryBtn, padding: "7px 14px", fontSize: 12 }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}



