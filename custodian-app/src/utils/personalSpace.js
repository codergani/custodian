/**
 * Utilities and categorization for Personal Space (My Vault).
 * Distinguishes personal everyday credentials from freelance client workspaces.
 */

export const PERSONAL_WORKSPACE_NAME = "Personal Space";
export const PERSONAL_PROJECT_NAME = "Personal Vault";

/**
 * Checks if a client object represents the user's Personal Space.
 * @param {Object} client 
 * @returns {boolean}
 */
export function isPersonalClient(client) {
  if (!client) return false;
  if (client.is_personal === true) return true;
  const name = (client.name || "").trim().toLowerCase();
  return (
    name === "personal space" ||
    name === "personal vault" ||
    name === "my space" ||
    name === "my vault" ||
    name === "personal"
  );
}

/**
 * Normal user categories for personal secrets.
 */
export const PERSONAL_CATEGORIES = [
  { id: "all", label: "All Items", icon: "Layers" },
  { id: "logins", label: "Logins & Accounts", icon: "Mail" },
  { id: "pins", label: "Apps & PINs", icon: "Smartphone" },
  { id: "notes", label: "Secure Notes & Words", icon: "FileText" },
  { id: "cards", label: "Cards & Identity", icon: "CreditCard" },
];

/**
 * Classifies a credential into a personal category.
 * @param {Object} cred 
 * @returns {"logins" | "pins" | "notes" | "cards" | "dev"}
 */
export function classifyPersonalSecret(cred) {
  if (!cred) return "logins";
  const type = (cred.secretType || "").toLowerCase();
  const label = (cred.label || "").toLowerCase();

  // 1. Check explicit secretType first
  if (type === "card") return "cards";
  if (type === "pin") return "pins";
  if (type === "note") return "notes";
  if (type === "login") return "logins";
  if (["database", "stripe", "supabase", "aws", "ssh", "api_key", "env_var"].includes(type)) {
    return "notes";
  }

  // 2. Keyword-based heuristics for unlabeled items
  // PINs / Wi-Fi / Device Passcodes
  if (label.includes("pin") || label.includes("wifi") || label.includes("wi-fi") || label.includes("passcode") || label.includes("unlock")) {
    return "pins";
  }

  // Cards & Banking
  if (label.includes("card") || label.includes("bank") || label.includes("debit") || label.includes("credit") || label.includes("cvv")) {
    return "cards";
  }

  // Secure Notes / Seed Words
  if (label.includes("note") || label.includes("seed") || label.includes("recovery") || label.includes("mnemonic") || label.includes("words") || label.includes("phrase")) {
    return "notes";
  }

  // Default: Logins & Accounts (Gmail, Outlook, Social, Netflix, etc.)
  return "logins";
}

/**
 * Calculates freelance client count excluding the personal space.
 * Used to enforce free tier limits without punishing users for having personal vaults.
 * @param {Array} clients 
 * @returns {Array}
 */
export function getFreelanceClients(clients = []) {
  return (clients || []).filter((c) => !isPersonalClient(c));
}
