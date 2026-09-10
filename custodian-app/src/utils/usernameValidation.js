/**
 * Username validation, normalization, and reserved name enforcement for Custodian.
 * Usernames must be lowercase-only, alphanumeric + underscores, 3-20 characters.
 */

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "custodian",
  "root",
  "system",
  "owner",
  "security",
  "founder",
  "official",
  "help",
  "api",
  "auth",
  "null",
  "undefined",
  "billing",
  "team",
  "staff",
  "moderator",
  "security_team",
  "vault",
  "master",
  "guest",
  "anonymous",
]);

/**
 * Normalizes username input: strips whitespace, removes leading '@', converts to lowercase.
 * @param {string} input 
 * @returns {string}
 */
export function normalizeUsername(input) {
  if (!input || typeof input !== "string") return "";
  let clean = input.trim().toLowerCase();
  if (clean.startsWith("@")) {
    clean = clean.slice(1);
  }
  return clean;
}

/**
 * Validates username string against all security constraints.
 * @param {string} input 
 * @returns {{ isValid: boolean, normalized: string, error: string | null }}
 */
export function validateUsername(input) {
  const normalized = normalizeUsername(input);

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      error: "Username cannot be empty.",
    };
  }

  if (normalized.length < 3) {
    return {
      isValid: false,
      normalized,
      error: "Username must be at least 3 characters long.",
    };
  }

  if (normalized.length > 20) {
    return {
      isValid: false,
      normalized,
      error: "Username cannot exceed 20 characters.",
    };
  }

  const validCharsRegex = /^[a-z0-9_]+$/;
  if (!validCharsRegex.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: "Username can only contain lowercase letters, numbers, and underscores (_).",
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      isValid: false,
      normalized,
      error: `'${normalized}' is a reserved name and cannot be registered.`,
    };
  }

  return {
    isValid: true,
    normalized,
    error: null,
  };
}
