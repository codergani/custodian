import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Copy, Check, ChevronRight, ChevronDown, KeyRound,
  Folder, FolderOpen, Building2, Search, ShieldCheck, AlertTriangle, X, LogOut, User,
  Sparkles, Crown, Zap, CheckCircle2, RotateCcw,
  FileText, Users, Upload, Download, UserPlus, ShieldAlert,
  Bell, BellRing, Calendar, DollarSign, ExternalLink, Clock, Edit3,
  History, PiggyBank, TrendingDown, ArrowDownRight, RefreshCw, CheckCircle,
  CheckSquare, Square, Target, Hourglass, ArrowRight, ArrowLeft, TrendingUp, BarChart3, Database, Lock,
  PackageCheck, Package, Command, Activity, Compass, Terminal,
  Paperclip, Pin, File, Link2, FileCheck, Maximize2, Minimize2,
  Menu, Sun, Moon, Layers, Rocket
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { encryptJSON, decryptJSON } from "./crypto";
import { getAutoLockMinutes } from "./security";
import { S, COLORS } from "./styles";
import { useTheme } from "./ThemeContext";
import { throttle } from "./utils/rateLimit";
import { registerBackButtonHandler } from "./native/nativeBridge";

// Modular sub-components
import {
  CustomDropdown, ToggleSwitch, getNextRenewalInfo, CredCard, FieldRow, calculateSecurityHealth
} from "./components/shared";
export { CustomDropdown, ToggleSwitch, getNextRenewalInfo, CredCard, FieldRow, calculateSecurityHealth };
import WorkspaceView from "./Workspace";
import WatchdogView from "./components/WatchdogView";
import TrashView from "./components/TrashView";
import ProfilePanel from "./components/ProfilePanel";
import OwnerCommandCenter from "./components/OwnerCommandCenter";
import AboutProjectView from "./components/AboutProjectView";
import EnvironmentStudio from "./components/EnvironmentStudio";
import DeploymentCenter from "./components/DeploymentCenter";
import { calculateProjectReadiness } from "./utils/projectReadiness";
import ModalRouter from "./components/ModalRouter";
import CommandPalette from "./components/CommandPalette";
import OnboardingTour from "./components/OnboardingTour";
import FloatingStickyNotes from "./components/FloatingStickyNotes";
import SharedSecretsView from "./components/SharedSecretsView";

export default function Vault({ userId, profile, vaultKey, ecdhPrivateKey, onLock, onProfileUpdate }) {
  const { theme, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showStickyNotes, setShowStickyNotes] = useState(() => {
    try {
      return localStorage.getItem("custodian_show_stickies") === "true";
    } catch {
      return false;
    }
  });
  const [showTour, setShowTour] = useState(() => {
    try {
      return !localStorage.getItem("custodian_tour_completed");
    } catch {
      return false;
    }
  });
  const getSavedNav = () => {
    try {
      const raw = sessionStorage.getItem(`custodian_nav_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  };

  const initialNav = getSavedNav();
  const [clients, setClients] = useState([]); // [{id, name, projects: [{id, name, details, credentials: [{id, ...decrypted}]}]}]
  const [trashedItems, setTrashedItems] = useState({ clients: [], projects: [], credentials: [] });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [selectedClient, setSelectedClient] = useState(initialNav.selectedClient || null);
  const [selectedProject, setSelectedProject] = useState(initialNav.selectedProject || null);
  const [projectTab, setProjectTab] = useState(initialNav.projectTab || "creds");
  const [expanded, setExpanded] = useState(initialNav.expanded || {});
  const [view, setView] = useState(initialNav.view || "vault");
  const [revealed, setRevealed] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [envFilter, setEnvFilter] = useState("all"); // all | prod | staging | dev
  const [openCmd, setOpenCmd] = useState(false);
  const [modal, setModal] = useState(null);
  const [actionErr, setActionErr] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Persist active navigation state to sessionStorage so idle backgrounding or wake-up never resets place
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `custodian_nav_${userId}`,
        JSON.stringify({
          selectedClient,
          selectedProject,
          projectTab,
          expanded,
          view,
        })
      );
    } catch {}
  }, [selectedClient, selectedProject, projectTab, expanded, view, userId]);

  // Inactivity Auto-Lock Monitor
  const [autoLockMinutes, setAutoLockMinutesState] = useState(() => getAutoLockMinutes(userId));

  useEffect(() => {
    if (!autoLockMinutes || autoLockMinutes <= 0) return;
    const timeoutMs = autoLockMinutes * 60 * 1000;
    let lastActivity = Date.now();

    const handleUserActivity = () => {
      lastActivity = Date.now();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivity >= timeoutMs) {
        onLock();
      }
    }, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastActivity >= timeoutMs) {
          onLock();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(checkInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoLockMinutes, onLock, userId]);

  // Contextual hardware back button handler for Android
  useEffect(() => {
    return registerBackButtonHandler(() => {
      if (modal) {
        setModal(null);
        return true;
      }
      if (openCmd) {
        setOpenCmd(false);
        return true;
      }
      if (showTour) {
        try {
          localStorage.setItem("custodian_tour_completed", "true");
        } catch {}
        setShowTour(false);
        return true;
      }
      if (mobileSidebarOpen) {
        setMobileSidebarOpen(false);
        return true;
      }
      if (selectedProject) {
        setSelectedProject(null);
        return true;
      }
      if (selectedClient) {
        setSelectedClient(null);
        return true;
      }
      if (view !== "vault") {
        setView("vault");
        return true;
      }
      return false; // Root overview: allow exitApp
    }, 10);
  }, [modal, openCmd, showTour, mobileSidebarOpen, selectedProject, selectedClient, view]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpenCmd((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowStickyNotes((prev) => {
          const next = !prev;
          try { localStorage.setItem("custodian_show_stickies", next ? "true" : "false"); } catch {}
          return next;
        });
      }
      if (e.key === "Escape" && openCmd) {
        setOpenCmd(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCmd]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      // 1. Fetch Clients
      const { data: allClients, error: cErr } = await supabase.from("clients").select("*").order("created_at");
      if (cErr) throw cErr;

      const activeClients = (allClients || []).filter((c) => !c.deleted_at);
      const trashedClients = (allClients || []).filter((c) => !!c.deleted_at);

      // 2. Fetch Projects
      const { data: allProjects, error: pErr } = await supabase.from("projects").select("*").order("created_at");
      if (pErr) throw pErr;

      const activeProjectsRaw = (allProjects || []).filter((p) => !p.deleted_at);
      const trashedProjects = (allProjects || []).filter((p) => !!p.deleted_at);

      // Decrypt project details
      const activeProjects = await Promise.all(
        activeProjectsRaw.map(async (p) => {
          let details = {
            lastDate: "",
            lastPartialDate: "",
            notes: "",
            checklist: [],
            scopeEditsCount: 0,
            createdAt: p.created_at,
          };
          if (p.details_blob) {
            try {
              const dec = await decryptJSON(vaultKey, p.details_blob);
              details = { ...details, ...dec };
            } catch {}
          } else {
            try {
              const local = localStorage.getItem(`custodian_proj_details_${p.id}`);
              if (local) details = { ...details, ...JSON.parse(local) };
            } catch {}
          }
          return {
            ...p,
            details,
          };
        })
      );

      // 3. Fetch Credentials
      const { data: allCreds, error: crErr } = await supabase.from("credentials").select("*").order("created_at");
      if (crErr) throw crErr;

      const activeCreds = (allCreds || []).filter((cr) => !cr.deleted_at);
      const trashedCredsRaw = (allCreds || []).filter((cr) => !!cr.deleted_at);

      // Decrypt active credentials
      const decryptedActiveCreds = await Promise.all(
        activeCreds.map(async (row) => {
          try {
            const data = await decryptJSON(vaultKey, row.encrypted_blob);
            const parsedCost = parseFloat(data.cost);
            const sanitizedCost = !isNaN(parsedCost) && parsedCost > 0 ? String(parsedCost) : null;
            const rInfo = getNextRenewalInfo(
              data.renewalDate,
              data.billingFrequency,
              data.reminderDays,
              data.alertIntent || "review_cancel",
              !!data.isCanceled
            ) || (sanitizedCost && !data.isCanceled ? {
              nextDate: data.renewalDate || "Active Cycle",
              daysUntil: 30,
              daysRemaining: 30,
              urgency: "active",
              frequency: data.billingFrequency || "monthly",
              alertIntent: data.alertIntent || "review_cancel",
            } : null);

            return {
              id: row.id,
              projectId: row.project_id,
              ...data,
              cost: sanitizedCost,
              planHistory: [],
              renewalInfo: rInfo,
            };
          } catch {
            return { id: row.id, projectId: row.project_id, label: "⚠ Could not decrypt", username: "", password: "", url: "", notes: "" };
          }
        })
      );

      // Decrypt trashed credentials
      const decryptedTrashedCreds = await Promise.all(
        trashedCredsRaw.map(async (row) => {
          const parentProj = (allProjects || []).find((p) => p.id === row.project_id);
          const parentClient = parentProj ? (allClients || []).find((c) => c.id === parentProj.client_id) : null;
          try {
            const data = await decryptJSON(vaultKey, row.encrypted_blob);
            const parsedCost = parseFloat(data.cost);
            const sanitizedCost = !isNaN(parsedCost) && parsedCost > 0 ? String(parsedCost) : null;
            return {
              id: row.id,
              projectId: row.project_id,
              projectName: parentProj?.name || "Unknown Project",
              clientName: parentClient?.name || "Unknown Client",
              deletedAt: row.deleted_at,
              ...data,
              cost: sanitizedCost,
              planHistory: [],
            };
          } catch {
            return {
              id: row.id,
              projectId: row.project_id,
              projectName: parentProj?.name || "Unknown Project",
              clientName: parentClient?.name || "Unknown Client",
              deletedAt: row.deleted_at,
              label: "Encrypted Credential",
              username: "",
            };
          }
        })
      );

      const built = activeClients.map((c) => ({
        id: c.id,
        name: c.name,
        projects: activeProjects
          .filter((p) => p.client_id === c.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            details: p.details,
            created_at: p.created_at,
            credentials: decryptedActiveCreds.filter((cr) => cr.projectId === p.id),
          })),
      }));

      setClients(built);
      if (activeClients.length > 0) {
        try {
          localStorage.setItem("custodian_tour_completed", "true");
        } catch {}
        setShowTour(false);
      }
      setTrashedItems({
        clients: trashedClients.map((c) => ({ ...c, deletedAt: c.deleted_at })),
        projects: trashedProjects.map((p) => {
          const parentClient = (allClients || []).find((c) => c.id === p.client_id);
          return { ...p, deletedAt: p.deleted_at, clientName: parentClient?.name || "Unknown Client" };
        }),
        credentials: decryptedTrashedCreds,
      });
    } catch (e) {
      setLoadErr(e.message);
    }
    setLoading(false);
  }, [vaultKey]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function showSuccess(msg) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 3500);
  }

  async function addClient(name) {
    setActionErr("");
    const { error } = await supabase.from("clients").insert({ owner_id: userId, name });
    if (error) { setActionErr(error.message); return; }
    setModal(null);
    loadAll();
  }

  async function deleteClient(id) {
    setActionErr("");
    const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { setActionErr(error.message); return; }
    if (selectedClient === id) { setSelectedClient(null); setSelectedProject(null); }
    showSuccess("Client moved to Recycle Bin (recoverable for 30 days)");
    loadAll();
  }

  async function addProject(clientId, name) {
    const { error } = await supabase.from("projects").insert({ client_id: clientId, name });
    if (error) { setActionErr(error.message); return; }
    setModal(null);
    loadAll();
  }

  async function updateProjectDetails(projectId, updatedDetails) {
    setActionErr("");
    try {
      const blob = await encryptJSON(vaultKey, updatedDetails);
      try {
        await supabase.from("projects").update({ details_blob: blob }).eq("id", projectId);
      } catch {}
      try {
        localStorage.setItem(`custodian_proj_details_${projectId}`, JSON.stringify(updatedDetails));
      } catch {}
      showSuccess("Project deadlines & specs updated!");
      setModal(null);
      loadAll();
    } catch (e) {
      setActionErr(e.message);
    }
  }

  async function deleteProject(id) {
    setActionErr("");
    try {
      const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) {
        // Fallback to hard delete if migration column is not present
        await supabase.from("projects").delete().eq("id", id);
        showSuccess("Project permanently deleted.");
      } else {
        showSuccess("Project moved to Recycle Bin (recoverable for 30 days)");
      }
    } catch {
      await supabase.from("projects").delete().eq("id", id);
      showSuccess("Project deleted.");
    }
    if (selectedProject === id) setSelectedProject(null);
    loadAll();
  }

  async function addCredential(projectId, cred) {
    const blob = await encryptJSON(vaultKey, cred);
    const { error } = await supabase.from("credentials").insert({ project_id: projectId, encrypted_blob: blob });
    if (error) { setActionErr(error.message); return; }
    setModal(null);
    showSuccess(`Saved "${cred.label || "secret"}"`);
    loadAll();
  }

  async function updateCredential(id, updatedCred) {
    setActionErr("");
    try {
      const blob = await encryptJSON(vaultKey, updatedCred);
      const { error } = await supabase.from("credentials").update({ encrypted_blob: blob }).eq("id", id);
      if (error) throw error;
      setModal(null);
      showSuccess(`Updated "${updatedCred.label || "secret"}"`);
      loadAll();
    } catch (e) {
      setActionErr(e.message);
    }
  }

  async function toggleCancelCredential(cred, markCanceled = true) {
    setActionErr("");
    try {
      const updated = {
        ...cred,
        isCanceled: markCanceled,
        canceledAt: markCanceled ? new Date().toISOString() : null,
      };
      delete updated.renewalInfo;
      delete updated.clientName;
      delete updated.projectName;
      delete updated.clientId;

      const blob = await encryptJSON(vaultKey, updated);
      const { error } = await supabase.from("credentials").update({ encrypted_blob: blob }).eq("id", cred.id);
      if (error) throw error;

      const currency = cred.currency || "$";
      const cost = parseFloat(cred.cost) || 0;
      if (markCanceled) {
        showSuccess(`Marked "${cred.label}" as canceled! Saved ${currency}${cost.toFixed(2)}/mo.`);
      } else {
        showSuccess(`Reactivated subscription tracking for "${cred.label}"`);
      }
      loadAll();
    } catch (e) {
      setActionErr(e.message);
    }
  }

  async function deleteCredential(id) {
    setActionErr("");
    try {
      const { error } = await supabase.from("credentials").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) {
        // Fallback to hard delete if column is not present
        await supabase.from("credentials").delete().eq("id", id);
        showSuccess("Secret permanently deleted.");
      } else {
        showSuccess("Secret moved to Recycle Bin (recoverable for 30 days)");
      }
    } catch {
      await supabase.from("credentials").delete().eq("id", id);
      showSuccess("Secret deleted.");
    }
    loadAll();
  }

  async function restoreCredential(cred) {
    setActionErr("");
    const { error } = await supabase.from("credentials").update({ deleted_at: null }).eq("id", cred.id);
    if (error) { setActionErr(error.message); return; }
    if (cred.projectId) {
      await supabase.from("projects").update({ deleted_at: null }).eq("id", cred.projectId);
    }
    showSuccess(`Restored "${cred.label}" to active vault`);
    loadAll();
  }

  async function restoreProject(proj) {
    setActionErr("");
    const { error } = await supabase.from("projects").update({ deleted_at: null }).eq("id", proj.id);
    if (error) { setActionErr(error.message); return; }
    if (proj.client_id) {
      await supabase.from("clients").update({ deleted_at: null }).eq("id", proj.client_id);
    }
    showSuccess(`Restored "${proj.name}" project to active vault`);
    loadAll();
  }

  async function restoreClient(client) {
    setActionErr("");
    const { error } = await supabase.from("clients").update({ deleted_at: null }).eq("id", client.id);
    if (error) { setActionErr(error.message); return; }
    showSuccess(`Restored "${client.name}" client to active vault`);
    loadAll();
  }

  async function permanentlyDelete(type, id, name) {
    setActionErr("");
    const table = type === "credential" ? "credentials" : type === "project" ? "projects" : "clients";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { setActionErr(error.message); return; }
    showSuccess(`Permanently deleted ${name || type}`);
    loadAll();
  }

  async function emptyTrash() {
    setActionErr("");
    try {
      const credIds = trashedItems.credentials.map((c) => c.id);
      const projIds = trashedItems.projects.map((p) => p.id);
      const clientIds = trashedItems.clients.map((c) => c.id);

      if (credIds.length) await supabase.from("credentials").delete().in("id", credIds);
      if (projIds.length) await supabase.from("projects").delete().in("id", projIds);
      if (clientIds.length) await supabase.from("clients").delete().in("id", clientIds);

      showSuccess("Recycle bin emptied successfully");
      loadAll();
    } catch (e) {
      setActionErr(e.message);
    }
  }

  function copyText(text, id) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  }

  async function handleUpgradePlan(newPlan) {
    setActionErr("");
    try {
      const { error } = await supabase.from("profiles").update({ plan: newPlan }).eq("id", userId);
      if (error) throw error;
      if (onProfileUpdate) {
        onProfileUpdate((prev) => ({ ...prev, plan: newPlan }));
      }
      setModal(null);
      showSuccess(`Plan updated to ${newPlan.toUpperCase()}`);
      return true;
    } catch (e) {
      setActionErr(e.message);
      return false;
    }
  }

  async function handleImportEnv(projectId, credsList) {
    setActionErr("");
    try {
      for (const cred of credsList) {
        const blob = await encryptJSON(vaultKey, cred);
        const { error } = await supabase.from("credentials").insert({ project_id: projectId, encrypted_blob: blob });
        if (error) throw error;
      }
      showSuccess(`Successfully imported ${credsList.length} secrets from .env`);
      setModal(null);
      loadAll();
    } catch (e) {
      setActionErr(e.message);
    }
  }

  // Detect default currency based on user locale or previous keys
  function detectDefaultCurrency() {
    try {
      const saved = localStorage.getItem(`custodian_currency_${userId}`);
      if (saved) return saved;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Calcutta") || tz.includes("Kolkata") || navigator.language?.includes("IN")) {
        return "₹";
      }
    } catch {}
    return "$";
  }

  const [defaultCurrency, setDefaultCurrency] = useState(detectDefaultCurrency);

  function handleSetCurrency(curr) {
    setDefaultCurrency(curr);
    try { localStorage.setItem(`custodian_currency_${userId}`, curr); } catch {}
    showSuccess(`Default currency updated to ${curr}`);
  }

  const isFree = (profile?.plan || "free") === "free";
  const [activeClientIds, setActiveClientIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`custodian_active_clients_${userId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const effectiveActiveClientIds = React.useMemo(() => {
    if (!isFree) return (clients || []).map((c) => c.id);
    if ((clients || []).length <= 2) return (clients || []).map((c) => c.id);
    const validSaved = activeClientIds.filter((id) => (clients || []).some((c) => c.id === id));
    if (validSaved.length === 2) return validSaved;
    return (clients || []).slice(0, 2).map((c) => c.id);
  }, [isFree, clients, activeClientIds]);

  function handleToggleActiveClient(clientId) {
    let updated;
    if (effectiveActiveClientIds.includes(clientId)) {
      if (effectiveActiveClientIds.length <= 1) {
        setActionErr("You must keep at least 1 active client.");
        return;
      }
      updated = effectiveActiveClientIds.filter((id) => id !== clientId);
    } else {
      if (effectiveActiveClientIds.length >= 2) {
        updated = [effectiveActiveClientIds[1], clientId];
      } else {
        updated = [...effectiveActiveClientIds, clientId];
      }
    }
    setActiveClientIds(updated);
    try {
      localStorage.setItem(`custodian_active_clients_${userId}`, JSON.stringify(updated));
    } catch {}
    showSuccess("Active clients updated!");
  }

  // Aggregate all active credentials across the entire vault
  const allActiveCreds = (clients || []).flatMap((c) =>
    (c?.projects || []).flatMap((p) =>
      (p?.credentials || []).map((cred) => ({
        ...cred,
        clientName: c?.name || "Client",
        clientId: c?.id,
        projectName: p?.name || "Project",
      }))
    )
  );

  const activeTrackedCreds = allActiveCreds.filter((c) => {
    if (c.isCanceled) return false;
    const parsed = parseFloat(c.cost);
    const hasCost = !isNaN(parsed) && parsed > 0;
    const hasRenewal = !!c.renewalInfo || !!c.renewalDate;
    return hasCost || hasRenewal;
  });

  const canceledCreds = allActiveCreds.filter((c) => {
    if (!c.isCanceled) return false;
    const parsed = parseFloat(c.cost);
    return !isNaN(parsed) && parsed > 0;
  });

  // Urgent alerts: only keys with alertIntent !== 'permanent_auto' that are critical or warning
  const urgentCreds = activeTrackedCreds.filter(
    (c) => c.alertIntent !== "permanent_auto" && (c.renewalInfo?.urgency === "critical" || c.renewalInfo?.urgency === "warning")
  );
  const criticalCount = activeTrackedCreds.filter((c) => c.alertIntent !== "permanent_auto" && c.renewalInfo?.urgency === "critical").length;

  // Multi-currency calculation for monthly spend (derived on render from active subscriptions)
  function getSpendByCurrency(items = []) {
    const map = {};
    for (const item of items) {
      if (item.isCanceled) continue;
      const curr = item.currency || defaultCurrency;
      const cost = parseFloat(item.cost) || 0;
      if (cost > 0) {
        map[curr] = (map[curr] || 0) + cost;
      }
    }
    const entries = Object.entries(map).filter(([_, v]) => v > 0);
    if (!entries.length) return `${defaultCurrency}0.00`;
    return entries.map(([curr, val]) => `${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ");
  }

  // Multi-currency calculation for money saved (derived on render from canceled subscriptions)
  function getSavingsByCurrency(items = []) {
    const map = {};
    for (const item of items) {
      if (!item.isCanceled) continue;
      const curr = item.currency || defaultCurrency;
      const cost = parseFloat(item.cost) || 0;
      if (cost > 0) {
        map[curr] = (map[curr] || 0) + cost;
      }
    }
    const entries = Object.entries(map).filter(([_, v]) => v > 0);
    if (!entries.length) return `+${defaultCurrency}0.00`;
    return entries.map(([curr, val]) => `+${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ");
  }

  function getAnnualSavingsByCurrency(items = []) {
    const map = {};
    for (const item of items) {
      if (!item.isCanceled) continue;
      const curr = item.currency || defaultCurrency;
      const cost = (parseFloat(item.cost) || 0) * 12;
      if (cost > 0) {
        map[curr] = (map[curr] || 0) + cost;
      }
    }
    const entries = Object.entries(map).filter(([_, v]) => v > 0);
    if (!entries.length) return `+${defaultCurrency}0.00 / yr`;
    return entries.map(([curr, val]) => `+${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ") + " / yr";
  }

  const formattedMonthlySpend = getSpendByCurrency(activeTrackedCreds);
  const formattedMonthlySavings = getSavingsByCurrency(canceledCreds);
  const formattedAnnualSavings = getAnnualSavingsByCurrency(canceledCreds);

  const currentClient = (clients || []).find((c) => c.id === selectedClient) || null;
  const currentProject = (currentClient?.projects || []).find((p) => p.id === selectedProject) || null;
  const atFreeLimit = profile?.plan === "free" && (clients || []).length >= 2;
  const isCurrentClientLocked = isFree && (clients || []).length > 2 && currentClient && !effectiveActiveClientIds.includes(currentClient.id);
  const totalTrashCount = (trashedItems?.clients || []).length + (trashedItems?.projects || []).length + (trashedItems?.credentials || []).length;

  // Selected client active API monthly spend string
  const currentClientTracked = currentClient
    ? (currentClient.projects || []).flatMap((p) => p?.credentials || []).filter((c) => c?.renewalInfo && !c?.isCanceled)
    : [];
  const currentClientSpendText = getSpendByCurrency(currentClientTracked);

  return (
    <div style={S.app}>
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`custodian-sidebar-backdrop ${mobileSidebarOpen ? "open" : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <div style={S.sidebar} className={`custodian-sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div style={S.sidebarHead}>
          <div style={S.brandRow}>
            <ShieldCheck size={18} color={COLORS.brass} />
            <span style={S.brandText}>CUSTODIAN</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              style={S.iconBtnGhost}
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle light/dark theme"
            >
              {theme === "dark" ? <Sun size={15} color={COLORS.brass} /> : <Moon size={15} color={COLORS.brass} />}
            </button>
            <button style={S.iconBtnGhost} onClick={onLock} title="Lock vault"><LogOut size={15} /></button>
            <button
              type="button"
              className="mobile-drawer-close"
              style={{ ...S.iconBtnGhost, color: COLORS.textDim, padding: 4 }}
              onClick={() => setMobileSidebarOpen(false)}
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Global Quick Search Shortcut (Ctrl+K) */}
        <button
          type="button"
          style={{
            ...S.secondaryBtn,
            width: "100%",
            justifyContent: "space-between",
            padding: "7px 10px",
            fontSize: 11.5,
            background: "rgba(255,255,255,0.03)",
            borderColor: COLORS.line,
          }}
          onClick={() => { setOpenCmd(true); setMobileSidebarOpen(false); }}
          title="Open Quick Search & Command Palette (Ctrl+K)"
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim }}>
            <Search size={13} /> Search Vault...
          </span>
          <span style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono, monospace", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>
            Ctrl+K
          </span>
        </button>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button
            style={{ ...S.secondaryBtn, flex: "1 1 45%", justifyContent: "center", padding: "6px 4px", fontSize: 11.5, ...(view === "vault" ? { borderColor: COLORS.brass, color: COLORS.text } : {}) }}
            onClick={() => { setView("vault"); setMobileSidebarOpen(false); }}
          >
            Vault
          </button>
          <button
            style={{
              ...S.secondaryBtn, flex: "1 1 45%", justifyContent: "center", padding: "6px 4px", fontSize: 11.5, position: "relative",
              ...(view === "watchdog" ? { borderColor: COLORS.brass, color: COLORS.text } : {}),
            }}
            onClick={() => { setView("watchdog"); setMobileSidebarOpen(false); }}
            title="Renewal Watchdog (API Subscriptions & Billing Tracker)"
          >
            Watchdog {criticalCount > 0 ? <span style={S.watchdogCounter}>{criticalCount}</span> : ""}
          </button>
          <button
            style={{ ...S.secondaryBtn, flex: "1 1 45%", justifyContent: "center", padding: "6px 4px", fontSize: 11.5, ...(view === "trash" ? { borderColor: COLORS.brass, color: COLORS.text } : {}) }}
            onClick={() => { setView("trash"); setMobileSidebarOpen(false); }}
          >
            Trash {totalTrashCount > 0 ? `(${totalTrashCount})` : ""}
          </button>
          <button
            style={{ ...S.secondaryBtn, flex: "1 1 45%", justifyContent: "center", padding: "6px 4px", fontSize: 11.5, ...(view === "profile" ? { borderColor: COLORS.brass, color: COLORS.text } : {}) }}
            onClick={() => { setView("profile"); setMobileSidebarOpen(false); }}
          >
            Profile
          </button>
          <button
            style={{
              ...S.secondaryBtn,
              flex: "1 1 calc(50% - 4px)",
              justifyContent: "center",
              padding: "6px 4px",
              fontSize: 11.5,
              ...(view === "workspace" ? { borderColor: COLORS.brass, color: COLORS.text } : {}),
            }}
            onClick={() => { setView("workspace"); setMobileSidebarOpen(false); }}
            title="Resource Library (Shared Docs, Assets & SOPs)"
          >
            <Package size={13} /> Library
          </button>
          <button
            style={{
              ...S.secondaryBtn,
              flex: "1 1 calc(50% - 4px)",
              justifyContent: "center",
              padding: "6px 4px",
              fontSize: 11.5,
              ...(view === "sharing" ? { borderColor: COLORS.brass, color: COLORS.text, background: "rgba(176,141,87,0.12)" } : {}),
            }}
            onClick={() => { setView("sharing"); setMobileSidebarOpen(false); }}
            title="Zero-Knowledge Secret Sharing (ECDH P-256)"
          >
            <Share2 size={13} color={COLORS.brass} /> Sharing
          </button>
          <button
            style={{
              ...S.secondaryBtn,
              flex: "1 1 100%",
              justifyContent: "center",
              padding: "6px 4px",
              fontSize: 11.5,
              position: "relative",
              ...(showStickyNotes ? { borderColor: "#E2B714", background: "rgba(226,183,20,0.12)", color: COLORS.text } : {}),
            }}
            onClick={() => {
              setShowStickyNotes((prev) => {
                const next = !prev;
                try { localStorage.setItem("custodian_show_stickies", next ? "true" : "false"); } catch {}
                return next;
              });
            }}
            title="Movable Floating Sticky Notes (Companion Scratchpad · Ctrl+Shift+N)"
          >
            <Pin size={13} style={{ transform: "rotate(45deg)", color: showStickyNotes ? "#E2B714" : COLORS.brass }} />
            <span>Stickies</span>
            {showStickyNotes && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#E2B714",
                  boxShadow: "0 0 6px #E2B714",
                  marginLeft: 3,
                }}
              />
            )}
          </button>
        </div>

        {view === "vault" && (
          <>
            <button
              style={S.addClientBtn}
              onClick={() => {
                setMobileSidebarOpen(false);
                if (atFreeLimit) {
                  setModal({ type: "upgrade" });
                } else {
                  setModal({ type: "client" });
                }
              }}
            >
              <Plus size={13} /> New client
            </button>
            {atFreeLimit && (
              <div
                style={{ fontSize: 11, color: COLORS.brass, padding: "2px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => { setModal({ type: "upgrade" }); setMobileSidebarOpen(false); }}
              >
                <Sparkles size={12} /> Free plan limit reached (2/2) — Upgrade
              </div>
            )}

            <div
              style={{
                ...S.treeClientRow,
                marginBottom: 6,
                background: !selectedClient && !selectedProject && view === "vault" ? "var(--highlight-bg, rgba(148,110,55,0.12))" : "transparent",
                border: `1px solid ${!selectedClient && !selectedProject && view === "vault" ? COLORS.brassDim : "transparent"}`,
              }}
              onClick={() => { setSelectedClient(null); setSelectedProject(null); setView("vault"); setMobileSidebarOpen(false); }}
            >
              <Crown size={14} color={COLORS.brass} />
              <span style={{ ...S.treeLabel, fontWeight: 600, color: !selectedClient && !selectedProject && view === "vault" ? COLORS.brass : COLORS.text }}>
                Vault Overview (All Projects)
              </span>
            </div>

            <div style={S.tree} className="custodian-tree-scroll">
              {loading && <div style={S.emptyTree}>Loading…</div>}
              {loadErr && <div style={S.errBox}><AlertTriangle size={14} /> {loadErr}</div>}
              {!loading && clients.length === 0 && <div style={S.emptyTree}>No clients yet.</div>}
              {clients.map((c) => {
                const isClientLocked = isFree && clients.length > 2 && !effectiveActiveClientIds.includes(c.id);
                return (
                  <div key={c.id}>
                    <div
                      style={{
                        ...S.treeClientRow,
                        ...(selectedClient === c.id && !selectedProject ? S.treeRowActive : {}),
                        opacity: isClientLocked ? 0.75 : 1,
                      }}
                      onClick={() => {
                        setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }));
                        setSelectedClient(c.id);
                        setSelectedProject(null);
                      }}
                    >
                      {expanded[c.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      {isClientLocked ? <Lock size={12} color="#D97706" /> : <Building2 size={13} color="#B08D57" />}
                      <span style={S.treeLabel}>{c.name}</span>
                      {isClientLocked ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#D97706", background: "rgba(245,158,11,0.15)", padding: "1px 4px", borderRadius: 4 }}>
                          Locked
                        </span>
                      ) : (
                        <span style={S.treeCount}>{c.projects.length}</span>
                      )}
                    </div>
                    {expanded[c.id] && c.projects.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          ...S.treeProjectRow,
                          ...(selectedProject === p.id ? S.treeRowActive : {}),
                          opacity: isClientLocked ? 0.7 : 1,
                        }}
                        onClick={() => {
                          setSelectedClient(c.id);
                          setSelectedProject(p.id);
                          setProjectTab("creds");
                          setMobileSidebarOpen(false);
                        }}
                      >
                        {selectedProject === p.id ? <FolderOpen size={12} color="#8FA98C" /> : <Folder size={12} color="#8A8680" />}
                        <span style={S.treeLabel}>{p.name}</span>
                        <span style={S.treeCount}>{p.credentials.length}</span>
                      </div>
                    ))}
                    {expanded[c.id] && !isClientLocked && (
                      <div style={S.addProjectRow} onClick={() => { setModal({ type: "project", clientId: c.id }); setMobileSidebarOpen(false); }}>
                        <Plus size={11} /> Add project
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {profile?.plan === "free" && (
              <div style={S.sidebarUpgradeBox}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.brass, fontSize: 12, fontWeight: 600 }}>
                  <Sparkles size={14} /> Upgrade to Pro
                </div>
                <div style={{ fontSize: 11, color: COLORS.textFaint, lineHeight: 1.4 }}>
                  Unlimited clients, renewal watchdog & team sharing.
                </div>
                <button
                  type="button"
                  style={{ ...S.primaryBtnSm, justifyContent: "center" }}
                  onClick={() => { setModal({ type: "upgrade" }); setMobileSidebarOpen(false); }}
                >
                  <Zap size={13} /> Upgrade Plan
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={S.main} className="custodian-main">
        {/* Mobile Header with Hamburger Menu */}
        <div className="mobile-only-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="hamburger-btn"
              style={{
                background: "none",
                border: "none",
                color: COLORS.text,
                cursor: "pointer",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
              onClick={() => setMobileSidebarOpen(true)}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} color="#B08D57" />
            </button>
            <div style={S.brandRow}>
              <ShieldCheck size={18} color={COLORS.brass} />
              <span style={S.brandText}>CUSTODIAN</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(profile?.plan === "founder" || profile?.role === "founder" || profile?.role === "admin") && (
              <button
                type="button"
                style={{ ...S.iconBtnGhost, padding: 6, color: "#FFD700" }}
                onClick={() => { window.location.hash = "#/admin"; }}
                title="Founder SuperAdmin HQ & Telemetry Control Room"
                aria-label="Founder HQ"
              >
                <Crown size={17} color="#FFD700" />
              </button>
            )}
            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: 6 }}
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle light/dark theme"
            >
              {theme === "dark" ? <Sun size={17} color={COLORS.brass} /> : <Moon size={17} color={COLORS.brass} />}
            </button>
            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: 6 }}
              onClick={() => setOpenCmd(true)}
              title="Search (Ctrl+K)"
            >
              <Search size={16} />
            </button>
            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: 6 }}
              onClick={onLock}
              title="Lock vault"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {/* Floating Toast Notification */}
        {actionSuccess && (
          <div
            style={{
              position: "fixed", bottom: 28, right: 28, zIndex: 10000,
              display: "flex", alignItems: "center", gap: 10,
              background: COLORS.panel,
              border: `1px solid ${COLORS.line}`, borderRadius: 12,
              padding: "12px 18px", boxShadow: "var(--card-shadow, 0 8px 32px rgba(0,0,0,0.15))",
              backdropFilter: "blur(12px)", minWidth: 260, maxWidth: 420,
              animation: "slideInToast 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(45,106,66,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CheckCircle size={15} color={COLORS.green} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.green }}>{actionSuccess}</div>
            </div>
            <button
              type="button"
              style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", padding: 2 }}
              onClick={() => setActionSuccess("")}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {actionErr && (
          <div
            style={{
              position: "fixed", bottom: 28, right: 28, zIndex: 10000,
              display: "flex", alignItems: "center", gap: 10,
              background: COLORS.panel,
              border: `1px solid ${COLORS.line}`, borderRadius: 12,
              padding: "12px 18px", boxShadow: "var(--card-shadow, 0 8px 32px rgba(0,0,0,0.15))",
              backdropFilter: "blur(12px)", minWidth: 260, maxWidth: 420,
              animation: "slideInToast 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(181,56,43,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={15} color={COLORS.red} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.red }}>{actionErr}</div>
            </div>
            <button
              type="button"
              style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", padding: 2 }}
              onClick={() => setActionErr("")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {view === "watchdog" ? (
          <WatchdogView
            allCreds={allActiveCreds}
            trackedCreds={activeTrackedCreds}
            urgentCreds={urgentCreds}
            canceledCreds={canceledCreds}
            formattedMonthlySpend={formattedMonthlySpend}
            formattedMonthlySavings={formattedMonthlySavings}
            formattedAnnualSavings={formattedAnnualSavings}
            onEditCred={(cred) => setModal({ type: "edit_cred", cred, projectId: cred.projectId })}
            onToggleCancel={toggleCancelCredential}
            onOpenUpgrade={() => setModal({ type: "upgrade" })}
            currentPlan={profile?.plan || "free"}
          />
        ) : view === "trash" ? (
          <TrashView
            trashedItems={trashedItems}
            onRestoreCred={restoreCredential}
            onRestoreProject={restoreProject}
            onRestoreClient={restoreClient}
            onPermanentDelete={permanentlyDelete}
            onEmptyTrash={emptyTrash}
          />
        ) : view === "profile" ? (
          <ProfilePanel
            profile={profile}
            defaultCurrency={defaultCurrency}
            onSetCurrency={handleSetCurrency}
            onSignedOut={onLock}
            onOpenUpgrade={() => setModal({ type: "upgrade" })}
            onCancelSubscription={() => handleUpgradePlan("free")}
            theme={theme}
            toggleTheme={toggleTheme}
            onSetAutoLock={(mins) => setAutoLockMinutesState(mins)}
          />
        ) : view === "workspace" ? (
          <WorkspaceView
            userId={userId}
            profile={profile}
            clients={clients}
            showSuccess={showSuccess}
            onOpenUpgrade={() => setModal({ type: "upgrade" })}
          />
        ) : view === "sharing" ? (
          <SharedSecretsView
            userId={userId}
            profile={profile}
            ecdhPrivateKey={ecdhPrivateKey}
            onOpenShareModal={() => setModal({ type: "share_secret" })}
          />
        ) : !currentClient ? (
          <OwnerCommandCenter
            clients={clients}
            profile={profile}
            allActiveCreds={allActiveCreds}
            activeTrackedCreds={activeTrackedCreds}
            canceledCreds={canceledCreds}
            urgentCreds={urgentCreds}
            formattedMonthlySpend={formattedMonthlySpend}
            formattedMonthlySavings={formattedMonthlySavings}
            formattedAnnualSavings={formattedAnnualSavings}
            defaultCurrency={defaultCurrency}
            onSelectClient={(clientId) => {
              setSelectedClient(clientId);
              setSelectedProject(null);
            }}
            onSelectProject={(clientId, projectId, tab = "creds") => {
              setSelectedClient(clientId);
              setSelectedProject(projectId);
              setProjectTab(tab);
            }}
            onAddClient={() => setModal({ type: "client" })}
            onAddProject={(clientId) => setModal({ type: "project", clientId })}
            onOpenUpgrade={() => setModal({ type: "upgrade" })}
            onOpenWatchdog={() => setView("watchdog")}
            onStartTour={() => setShowTour(true)}
          />
        ) : isCurrentClientLocked ? (
          <div style={{ ...S.welcomeState, padding: "50px 24px", maxWidth: 580, margin: "30px auto" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: "1.5px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Lock size={26} color="#D97706" />
            </div>
            <div style={{ ...S.welcomeTitle, fontSize: 20 }}>
              "{currentClient.name}" is Locked
            </div>
            <div style={{ ...S.welcomeSub, fontSize: 13, marginTop: 8, maxWidth: 460 }}>
              You have <strong>{clients.length} clients</strong> in your vault from your previous Pro subscription. The Free plan allows access to <strong>2 active clients</strong> at a time.
            </div>

            {/* Active Client Selection Checkboxes */}
            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "16px 18px", marginTop: 22, width: "100%", textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Choose which 2 clients to keep active on Free:</span>
                <span style={{ fontSize: 11, color: effectiveActiveClientIds.length === 2 ? "#16A34A" : COLORS.brass, fontWeight: 600 }}>
                  ({effectiveActiveClientIds.length}/2 Active)
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {clients.map((cItem) => {
                  const isChecked = effectiveActiveClientIds.includes(cItem.id);
                  return (
                    <label
                      key={cItem.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: isChecked ? "rgba(176,141,87,0.12)" : COLORS.panel,
                        border: `1px solid ${isChecked ? COLORS.brass : COLORS.line}`,
                        cursor: "pointer",
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleActiveClient(cItem.id)}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400, color: COLORS.text }}>{cItem.name}</span>
                      </div>
                      <span style={{ fontSize: 10.5, color: isChecked ? COLORS.brass : COLORS.textFaint, fontWeight: 600 }}>
                        {isChecked ? "✓ Active" : "🔒 Locked"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Upgrade CTA */}
            <div style={{ ...S.sidebarUpgradeBox, marginTop: 18, width: "100%", textAlign: "center", padding: "16px 20px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>
                Want unlimited access to all {clients.length} clients without switching?
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4, marginBottom: 14 }}>
                Upgrade to Custodian Pro ($8/mo) for unlimited clients, renewal watchdog, and team features.
              </div>
              <button
                type="button"
                style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", padding: "10px 18px", fontSize: 13 }}
                onClick={() => setModal({ type: "upgrade" })}
              >
                <Zap size={15} /> Upgrade to Pro ($8/mo) — Unlock All Clients
              </button>
            </div>
          </div>
        ) : !currentProject ? (
          <>
            {/* Client View Breadcrumbs */}
            <div style={S.breadcrumbBar}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{ color: COLORS.brass, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onClick={() => { setSelectedClient(null); setSelectedProject(null); }}
                  title="Return to Vault Overview"
                >
                  <Crown size={12} color={COLORS.brass} /> Vault Overview
                </span>
                <span style={{ color: COLORS.textFaint }}>/</span>
                <span style={{ color: COLORS.text, fontWeight: 600 }}>{currentClient.name}</span>
              </div>

              <button
                type="button"
                style={{ ...S.secondaryBtn, padding: "4px 8px", fontSize: 11 }}
                onClick={() => { setSelectedClient(null); setSelectedProject(null); }}
              >
                <ArrowLeft size={12} /> Back to Overview
              </button>
            </div>

            <div style={S.mainHeadRow}>
              <div>
                <div style={{ ...S.eyebrow, color: COLORS.brass }}>CLIENT WORKSPACE</div>
                <h1 style={S.mainTitle}>{currentClient.name}</h1>
                <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{currentClient.projects?.length || 0} Projects</span>
                  {currentClientSpendText && (
                    <span style={S.clientSpendBadge}>
                      <DollarSign size={11} /> {currentClientSpendText}/mo active spend
                    </span>
                  )}
                  {atFreeLimit && (
                    <span style={S.planBadge}>2/2 Free Clients</span>
                  )}
                </div>
              </div>

              <div style={S.headActions}>
                <button
                  style={S.secondaryBtn}
                  onClick={() => setModal({ type: "team_members", client: currentClient })}
                  title="Manage client team members & role permissions"
                >
                  <Users size={13} /> Team
                </button>
                <button style={S.primaryBtnSm} onClick={() => setModal({ type: "project", clientId: currentClient.id })}>
                  <Plus size={13} /> New Project
                </button>
                <button
                  style={{ ...S.iconBtnGhost, color: COLORS.red }}
                  title="Delete Client"
                  onClick={() => handleDeleteClient(currentClient.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Projects</span>
                <span style={{ fontSize: 11, color: COLORS.textFaint }}>{currentClient.projects?.length || 0} active</span>
              </div>

              <div style={S.projectGrid}>
                {currentClient.projects?.map((p) => (
                  <div key={p.id} style={S.projectTile} onClick={() => { setSelectedProject(p.id); setProjectTab("creds"); }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Folder size={18} color={COLORS.brass} />
                      <span style={{ ...S.rolePillMember, fontSize: 9 }}>{p.credentials?.length || 0} secrets</span>
                    </div>
                    <div style={S.projectTileName}>{p.name}</div>
                    <div style={S.projectTileMeta}>{p.details?.lastDate ? `Due ${p.details.lastDate}` : "No deadline"}</div>
                  </div>
                ))}
                <div style={S.projectTileAdd} onClick={() => setModal({ type: "project", clientId: currentClient.id })}>
                  <Plus size={18} />
                  <span>New Project</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Project View Breadcrumbs */}
            <div style={S.breadcrumbBar}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{ color: COLORS.brass, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onClick={() => { setSelectedClient(null); setSelectedProject(null); }}
                  title="Return to Vault Overview"
                >
                  <Crown size={12} color={COLORS.brass} /> Vault Overview
                </span>
                <span style={{ color: COLORS.textFaint }}>/</span>
                <span
                  style={{ color: COLORS.textDim, cursor: "pointer" }}
                  onClick={() => setSelectedProject(null)}
                  title={`View all projects in ${currentClient.name}`}
                >
                  {currentClient.name}
                </span>
                <span style={{ color: COLORS.textFaint }}>/</span>
                <span style={{ color: COLORS.text, fontWeight: 600 }}>{currentProject.name}</span>
              </div>

              <button
                type="button"
                style={{ ...S.secondaryBtn, padding: "4px 8px", fontSize: 11 }}
                onClick={() => setSelectedProject(null)}
              >
                <ArrowLeft size={12} /> Back to Projects
              </button>
            </div>

            {/* Project Title Row with Add Secret in the same line */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...S.eyebrow, color: COLORS.brass }}>{currentClient.name.toUpperCase()}</div>
                <h2 style={{ ...S.mainTitle, fontSize: 20, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentProject.name}
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {projectTab === "creds" && (
                  <button
                    style={{ ...S.primaryBtnSm, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => setModal({ type: "cred", projectId: currentProject.id })}
                    title="Add a new encrypted secret / API key"
                  >
                    <Plus size={14} /> <span>Add secret</span>
                  </button>
                )}
                <button
                  style={{ ...S.iconBtnGhost, color: COLORS.red, padding: 6 }}
                  title="Delete Project"
                  onClick={() => deleteProject(currentProject.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Production Readiness Score HUD Bar */}
            {(() => {
              const readiness = calculateProjectReadiness(currentProject, []);
              const isReady = readiness.score >= 85;
              const isWarning = readiness.score < 60;
              const color = isReady ? "#2D6A42" : isWarning ? "#B5382B" : COLORS.brass;
              const badgeBg = isReady ? "rgba(45,106,66,0.12)" : isWarning ? "rgba(181,56,43,0.12)" : "rgba(148,110,55,0.12)";

              return (
                <div
                  style={{
                    background: COLORS.panelAlt,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ShieldCheck size={14} color={color} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.text, letterSpacing: "0.02em" }}>
                          PRODUCTION READINESS: {readiness.score}%
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: badgeBg, color, fontWeight: 600 }}>
                          {readiness.status === "production_ready" ? "READY" : readiness.status === "in_progress" ? "IN PROGRESS" : "NEEDS ATTENTION"}
                        </span>
                      </div>
                      <div style={{ width: "100%", maxWidth: 260, height: 5, background: COLORS.line, borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                        <div style={{ height: "100%", width: `${readiness.score}%`, background: color, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {readiness.issues.length > 0 && (
                      <span style={{ fontSize: 11.5, color: COLORS.red, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                        <AlertTriangle size={12} /> {readiness.issues.length} item(s) to resolve
                      </span>
                    )}
                    <button
                      type="button"
                      style={{
                        ...S.secondaryBtn,
                        padding: "5px 12px",
                        fontSize: 11.5,
                        color: COLORS.brass,
                        borderColor: COLORS.brassDim,
                        background: "var(--highlight-bg, rgba(148,110,55,0.08))",
                        fontWeight: 600,
                      }}
                      onClick={() => setModal({ type: "readiness_audit", project: currentProject })}
                    >
                      Review Readiness
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Sub Actions Bar (Client Handover, Import/Export .env) */}
            <div style={S.projectSubActionsBar} className="custodian-hscroll">
              <button
                type="button"
                style={{ ...S.actionChipBtn, color: COLORS.brass, borderColor: COLORS.brassDim }}
                onClick={() => setModal({ type: "handover", project: currentProject, clientName: currentClient.name })}
                title="Generate 1-Click Executive Client Handover Package"
              >
                <PackageCheck size={13} color={COLORS.brass} /> <span>Client Handover</span>
              </button>
              <button
                type="button"
                style={S.actionChipBtn}
                onClick={() => setModal({ type: "import_env", projectId: currentProject.id })}
                title="Import .env file or text"
              >
                <Download size={13} color={COLORS.textDim} /> <span>Import .env</span>
              </button>
              <button
                type="button"
                style={S.actionChipBtn}
                onClick={() => setModal({ type: "export_env", project: currentProject })}
                title="Export encrypted or decrypted .env"
              >
                <Upload size={13} color={COLORS.textDim} /> <span>Export .env</span>
              </button>
              {(projectTab === "timeline" || projectTab === "notes") && (
                <button
                  type="button"
                  style={S.actionChipBtn}
                  onClick={() => setModal({ type: "edit_project_details", project: currentProject })}
                >
                  <Edit3 size={13} color={COLORS.brass} /> <span>Edit {projectTab === "timeline" ? "Deadlines" : "Notes"}</span>
                </button>
              )}
              {projectTab === "deployment" && (
                <button
                  type="button"
                  style={S.actionChipBtn}
                  onClick={() => setModal({ type: "edit_deployment", project: currentProject })}
                >
                  <Edit3 size={13} color={COLORS.brass} /> <span>Edit Runbook</span>
                </button>
              )}
            </div>

            {/* Project Tabs Row */}
            {(() => {
              const details = currentProject.details || {};
              const checklist = details.checklist || [];
              const completedTasks = checklist.filter((t) => t.completed).length;
              const attachments = details.attachments || [];

              return (
                <div style={{ ...S.projectTabNav, overflowX: "auto", flexWrap: "nowrap" }} className="projectTabNav custodian-hscroll">
                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "env_studio" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("env_studio")}
                  >
                    <Layers size={13} color={projectTab === "env_studio" ? COLORS.brass : COLORS.textDim} />
                    <span>.env Studio & Matrix</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "creds" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("creds")}
                  >
                    <KeyRound size={13} color={projectTab === "creds" ? COLORS.brass : COLORS.textDim} />
                    <span>Secrets ({currentProject.credentials.length})</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "deployment" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("deployment")}
                  >
                    <Rocket size={13} color={projectTab === "deployment" ? "#7AA2E3" : COLORS.textDim} />
                    <span>Deployment Runbook</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "timeline" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("timeline")}
                  >
                    <Calendar size={13} color={projectTab === "timeline" ? COLORS.brass : COLORS.textDim} />
                    <span>Delivery Timeline</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "checklist" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("checklist")}
                  >
                    <CheckSquare size={13} color={projectTab === "checklist" ? "#8FA98C" : COLORS.textDim} />
                    <span>Deliverables ({completedTasks}/{checklist.length})</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "docs" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("docs")}
                  >
                    <Pin size={13} color={projectTab === "docs" ? COLORS.brass : COLORS.textDim} />
                    <span>PRDs & Docs ({attachments.length})</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...S.projectTabBtn,
                      whiteSpace: "nowrap",
                      ...(projectTab === "notes" ? S.projectTabBtnActive : {}),
                    }}
                    onClick={() => setProjectTab("notes")}
                  >
                    <FileText size={13} color={projectTab === "notes" ? COLORS.brass : COLORS.textDim} />
                    <span>Specs</span>
                  </button>
                </div>
              );
            })()}

            {projectTab === "env_studio" ? (
              <EnvironmentStudio
                project={currentProject}
                onAddCred={(initial) => setModal({ type: "cred", projectId: currentProject.id, initialData: initial })}
                onUpdateCred={(cred) => setModal({ type: "edit_cred", cred, projectId: currentProject.id })}
                onDeleteCred={(id) => deleteCredential(id)}
                onOpenImport={() => setModal({ type: "import_env", projectId: currentProject.id })}
                showSuccess={showSuccess}
              />
            ) : projectTab === "deployment" ? (
              <DeploymentCenter
                project={currentProject}
                onOpenEdit={() => setModal({ type: "edit_deployment", project: currentProject })}
                showSuccess={showSuccess}
              />
            ) : projectTab !== "creds" ? (
              <AboutProjectView
                project={currentProject}
                activeTab={projectTab}
                onUpdateDetails={(newDetails) => updateProjectDetails(currentProject.id, newDetails)}
                onOpenEdit={() => setModal({ type: "edit_project_details", project: currentProject })}
              />
            ) : (() => {
              const projectCreds = currentProject.credentials || [];
              const globalCount = projectCreds.filter((c) => !c.environment || c.environment === "global").length;
              const prodCount = projectCreds.filter((c) => c.environment === "prod").length;
              const stagingCount = projectCreds.filter((c) => c.environment === "staging").length;
              const devCount = projectCreds.filter((c) => c.environment === "dev").length;

              const displayedCreds = projectCreds.filter((c) => {
                if (envFilter === "global") return !c.environment || c.environment === "global";
                if (envFilter === "prod") return c.environment === "prod";
                if (envFilter === "staging") return c.environment === "staging";
                if (envFilter === "dev") return c.environment === "dev";
                return true;
              });

              const health = calculateSecurityHealth(projectCreds);

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Environment Filters & Security Score Badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 5, overflowX: "auto", WebkitOverflowScrolling: "touch", flexWrap: "nowrap", maxWidth: "100%", paddingBottom: 2 }} className="custodian-hscroll">
                      {[
                        { id: "all", label: `All (${projectCreds.length})` },
                        { id: "global", label: `🌐 Global (${globalCount})` },
                        { id: "prod", label: `🚀 Prod (${prodCount})` },
                        { id: "staging", label: `🧪 Staging (${stagingCount})` },
                        { id: "dev", label: `💻 Dev (${devCount})` },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          style={{
                            ...S.secondaryBtn,
                            padding: "4px 10px",
                            fontSize: 11.5,
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            background: envFilter === f.id ? "rgba(176,141,87,0.18)" : "transparent",
                            borderColor: envFilter === f.id ? COLORS.brass : COLORS.line,
                            color: envFilter === f.id ? COLORS.brass : COLORS.textDim,
                            fontWeight: envFilter === f.id ? 600 : 400,
                          }}
                          onClick={() => setEnvFilter(f.id)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {projectCreds.length > 0 && (
                      <div
                        style={{ ...S.healthBadgeGood, cursor: "pointer", ...(health.score < 85 ? S.healthBadgeWarning : {}) }}
                        onClick={() => setModal({ type: "health_audit", project: currentProject })}
                        title="Click to view Vault Security Health Audit score breakdown"
                      >
                        <ShieldCheck size={12} />
                        <span>Security Score: {health.score}/100</span>
                      </div>
                    )}
                  </div>

                  {projectCreds.length === 0 ? (
                    <div style={{ ...S.welcomeState, padding: "48px 20px", height: "auto", minHeight: 320, background: "rgba(255,255,255,0.02)", border: `1px dashed ${COLORS.line}`, borderRadius: 12 }}>
                      <div style={{ ...S.dialRing, width: 48, height: 48, background: "rgba(176,141,87,0.15)", borderColor: COLORS.brass }}>
                        <KeyRound size={24} color="#B08D57" />
                      </div>
                      <div style={{ ...S.welcomeTitle, fontSize: 18, color: COLORS.text, marginTop: 4 }}>
                        Your Project Secret Vault
                      </div>
                      <div style={{ ...S.welcomeSub, maxWidth: 460, fontSize: 13, lineHeight: 1.5 }}>
                        Securely store API keys, tokens, and database credentials with client-side AES-256-GCM encryption, or import your existing <code>.env</code> file in seconds.
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                        <button style={{ ...S.primaryBtn, padding: "10px 18px", fontSize: 13 }} onClick={() => setModal({ type: "cred", projectId: currentProject.id })}>
                          <Plus size={15} /> Add First Secret
                        </button>
                        <button style={{ ...S.secondaryBtn, padding: "10px 16px", fontSize: 13 }} onClick={() => setModal({ type: "import_env", projectId: currentProject.id })}>
                          <Download size={15} /> Import .env File
                        </button>
                      </div>
                    </div>
                  ) : displayedCreds.length === 0 ? (
                    <div style={{ ...S.emptyState, padding: "32px 20px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: `1px solid ${COLORS.line}`, borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>
                        No specific {envFilter.toUpperCase()} overrides found
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textDim, maxWidth: 460, margin: "0 auto 12px", lineHeight: 1.5 }}>
                        Your {globalCount} 🌐 <strong>Global</strong> credentials automatically apply across all environments (including {envFilter.toUpperCase()}) unless you create an environment-specific override.
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button style={{ ...S.secondaryBtn, fontSize: 11.5, padding: "6px 12px" }} onClick={() => setEnvFilter("global")}>
                          View 🌐 Global Secrets ({globalCount})
                        </button>
                        <button style={{ ...S.primaryBtn, fontSize: 11.5, padding: "6px 12px" }} onClick={() => setModal({ type: "cred", projectId: currentProject.id })}>
                          + Add {envFilter.toUpperCase()} Override
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={S.credGrid}>
                      {displayedCreds.map((cred) => (
                        <CredCard
                          key={cred.id}
                          cred={cred}
                          revealed={!!revealed[cred.id]}
                          onReveal={() => setRevealed((r) => ({ ...r, [cred.id]: !r[cred.id] }))}
                          onCopy={copyText}
                          copiedId={copiedId}
                          onEdit={() => setModal({ type: "edit_cred", cred, projectId: currentProject.id })}
                          onDelete={() => deleteCredential(cred.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {modal && (
        <ModalRouter
          modal={modal}
          currentPlan={profile?.plan || "free"}
          defaultCurrency={defaultCurrency}
          userId={userId}
          userEmail={profile?.email}
          ecdhPrivateKey={ecdhPrivateKey}
          onClose={() => setModal(null)}
          onAddClient={addClient}
          onAddProject={addProject}
          onUpdateProjectDetails={updateProjectDetails}
          onAddCred={addCredential}
          onUpdateCred={updateCredential}
          onImportEnv={handleImportEnv}
          onUpgradePlan={handleUpgradePlan}
          onOpenUpgrade={() => setModal({ type: "upgrade" })}
          showSuccess={showSuccess}
        />

      )}

      {showTour && !loading && clients.length === 0 && (
        <OnboardingTour
          onComplete={() => {
            try {
              localStorage.setItem("custodian_tour_completed", "true");
            } catch {}
            setShowTour(false);
          }}
        />
      )}
      {openCmd && (
        <CommandPalette
          clients={clients}
          onClose={() => setOpenCmd(false)}
          onSelectProject={(cId, pId, tab = "env_studio") => {
            setSelectedClient(cId);
            setSelectedProject(pId);
            setProjectTab(tab);
            setView("vault");
            setOpenCmd(false);
          }}
          onCopySecret={(text, label) => {
            copyText(text, "cmd-copy");
            showSuccess(`Copied "${label}"`);
            setOpenCmd(false);
          }}
          onNavigate={(targetView) => {
            setView(targetView);
            setSelectedClient(null);
            setSelectedProject(null);
            setOpenCmd(false);
          }}
          onOpenModal={(modalType, payload) => {
            setModal({ type: modalType, ...payload });
            setOpenCmd(false);
          }}
        />
      )}

      {/* Movable Floating Sticky Notes Companion Widget */}
      <FloatingStickyNotes
        isOpen={showStickyNotes}
        currentPlan={profile?.plan || "free"}
        onOpenUpgrade={() => setModal({ type: "upgrade" })}
        onClose={() => {
          setShowStickyNotes(false);
          try {
            localStorage.setItem("custodian_show_stickies", "false");
          } catch {}
        }}
        activeProject={currentProject}
        onAppendToProject={(text) => {
          if (!currentProject) return;
          const currentNotes = currentProject.details?.notes || "";
          const newNotes = currentNotes
            ? `${currentNotes}\n\n[Sticky Note · ${new Date().toLocaleDateString()}]:\n${text}`
            : text;
          updateProjectDetails(currentProject.id, { ...(currentProject.details || {}), notes: newNotes });
          showSuccess(`Appended to ${currentProject.name} specs!`);
        }}
      />
    </div>
  );
}