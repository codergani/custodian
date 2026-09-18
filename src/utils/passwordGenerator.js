/**
 * Custodian — Secure Password & Secret Generator
 * 100% client-side using crypto.getRandomValues() — no Math.random(), no server calls.
 */
import { EFF_SHORT_WORDLIST } from "./wordlist";

// ─── Character Sets ──────────────────────────────────────────────
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
const HEX_CHARS = "0123456789abcdef";
const BASE64_URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Ambiguous characters that can be excluded for readability
const AMBIGUOUS = new Set(["0", "O", "o", "1", "l", "I"]);

/**
 * Generate cryptographically secure random bytes.
 * @param {number} count
 * @returns {Uint8Array}
 */
function secureRandomBytes(count) {
  const arr = new Uint8Array(count);
  crypto.getRandomValues(arr);
  return arr;
}

/**
 * Pick a random index in [0, max) using rejection sampling to avoid modulo bias.
 * @param {number} max
 * @returns {number}
 */
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const byteCount = Math.ceil(Math.log2(max) / 8) || 1;
  const maxValid = Math.floor((256 ** byteCount) / max) * max;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const bytes = secureRandomBytes(byteCount);
    let value = 0;
    for (let i = 0; i < byteCount; i++) value = (value << 8) | bytes[i];
    if (value < maxValid) return value % max;
  }
}

// ─── Password Generator ─────────────────────────────────────────
/**
 * Generate a random password with configurable character sets.
 * @param {object} options
 * @param {number} options.length - Password length (8-128)
 * @param {boolean} options.uppercase - Include uppercase letters
 * @param {boolean} options.lowercase - Include lowercase letters
 * @param {boolean} options.digits - Include digits
 * @param {boolean} options.symbols - Include symbols
 * @param {boolean} options.excludeAmbiguous - Exclude 0, O, o, 1, l, I
 * @returns {string}
 */
export function generatePassword({
  length = 24,
  uppercase = true,
  lowercase = true,
  digits = true,
  symbols = true,
  excludeAmbiguous = false,
} = {}) {
  let charset = "";
  if (lowercase) charset += LOWERCASE;
  if (uppercase) charset += UPPERCASE;
  if (digits) charset += DIGITS;
  if (symbols) charset += SYMBOLS;

  if (!charset) charset = LOWERCASE + DIGITS; // Fallback

  if (excludeAmbiguous) {
    charset = charset.split("").filter((c) => !AMBIGUOUS.has(c)).join("");
  }

  const clampedLen = Math.max(4, Math.min(128, length));
  let result = "";

  // Ensure at least one char from each selected set (if length allows)
  const required = [];
  if (lowercase && clampedLen >= 4) {
    const set = excludeAmbiguous ? LOWERCASE.split("").filter(c => !AMBIGUOUS.has(c)).join("") : LOWERCASE;
    required.push(set[secureRandomInt(set.length)]);
  }
  if (uppercase && clampedLen >= 4) {
    const set = excludeAmbiguous ? UPPERCASE.split("").filter(c => !AMBIGUOUS.has(c)).join("") : UPPERCASE;
    required.push(set[secureRandomInt(set.length)]);
  }
  if (digits && clampedLen >= 4) {
    const set = excludeAmbiguous ? DIGITS.split("").filter(c => !AMBIGUOUS.has(c)).join("") : DIGITS;
    required.push(set[secureRandomInt(set.length)]);
  }
  if (symbols && clampedLen >= 4) {
    required.push(SYMBOLS[secureRandomInt(SYMBOLS.length)]);
  }

  // Fill remaining with random chars from full charset
  const remaining = clampedLen - required.length;
  for (let i = 0; i < remaining; i++) {
    result += charset[secureRandomInt(charset.length)];
  }

  // Insert required chars at random positions
  const arr = result.split("");
  for (const ch of required) {
    const pos = secureRandomInt(arr.length + 1);
    arr.splice(pos, 0, ch);
  }

  return arr.join("");
}

// ─── API Key Generator ──────────────────────────────────────────
/**
 * Generate a random API key in hex or base64 format.
 * @param {object} options
 * @param {number} options.length - Key length in characters (16-128)
 * @param {"hex"|"base64"} options.format - Output encoding
 * @param {string} options.prefix - Optional prefix (e.g., "sk_live_")
 * @returns {string}
 */
export function generateApiKey({
  length = 48,
  format = "hex",
  prefix = "",
} = {}) {
  const clampedLen = Math.max(8, Math.min(128, length));
  const charset = format === "base64" ? BASE64_URL_CHARS : HEX_CHARS;
  let key = "";
  for (let i = 0; i < clampedLen; i++) {
    key += charset[secureRandomInt(charset.length)];
  }
  return prefix + key;
}

// ─── Hex Token Generator ────────────────────────────────────────
/**
 * Generate a pure hex string.
 * @param {number} length - Length of hex string (default 64)
 * @returns {string}
 */
export function generateHexToken(length = 64) {
  const clampedLen = Math.max(8, Math.min(256, length));
  let hex = "";
  for (let i = 0; i < clampedLen; i++) {
    hex += HEX_CHARS[secureRandomInt(16)];
  }
  return hex;
}

// ─── Base64 Secret Generator ────────────────────────────────────
/**
 * Generate a URL-safe base64 random string.
 * @param {number} length - Length of base64 string (default 44)
 * @returns {string}
 */
export function generateBase64Secret(length = 44) {
  const clampedLen = Math.max(8, Math.min(256, length));
  let b64 = "";
  for (let i = 0; i < clampedLen; i++) {
    b64 += BASE64_URL_CHARS[secureRandomInt(BASE64_URL_CHARS.length)];
  }
  return b64;
}

// ─── UUID v4 Generator ──────────────────────────────────────────
/**
 * Generate a standard UUID v4.
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  const bytes = secureRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── Passphrase Generator (Diceware-style) ──────────────────────
/**
 * Generate a random passphrase from the EFF short wordlist.
 * @param {object} options
 * @param {number} options.wordCount - Number of words (3-10)
 * @param {string} options.separator - Word separator (default "-")
 * @param {boolean} options.capitalize - Capitalize first letter of each word
 * @returns {string}
 */
export function generatePassphrase({
  wordCount = 5,
  separator = "-",
  capitalize = false,
} = {}) {
  const count = Math.max(3, Math.min(10, wordCount));
  const words = [];
  for (let i = 0; i < count; i++) {
    let word = EFF_SHORT_WORDLIST[secureRandomInt(EFF_SHORT_WORDLIST.length)];
    if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
    words.push(word);
  }
  return words.join(separator);
}

// ─── Entropy Calculator ─────────────────────────────────────────
/**
 * Calculate entropy in bits for a generated secret.
 * @param {string} mode - "password" | "apikey" | "hex" | "base64" | "uuid" | "passphrase"
 * @param {object} options - Mode-specific options
 * @returns {{ bits: number, label: string, color: string }}
 */
export function calculateEntropy(mode, options = {}) {
  let bits = 0;

  if (mode === "password") {
    let charsetSize = 0;
    if (options.lowercase) charsetSize += 26;
    if (options.uppercase) charsetSize += 26;
    if (options.digits) charsetSize += 10;
    if (options.symbols) charsetSize += SYMBOLS.length;
    if (options.excludeAmbiguous) charsetSize = Math.max(1, charsetSize - 6);
    bits = Math.round((options.length || 24) * Math.log2(Math.max(1, charsetSize)));
  } else if (mode === "apikey") {
    const charsetSize = options.format === "base64" ? 64 : 16;
    bits = Math.round((options.length || 48) * Math.log2(charsetSize));
  } else if (mode === "hex") {
    bits = Math.round((options.length || 64) * 4); // log2(16) = 4
  } else if (mode === "base64") {
    bits = Math.round((options.length || 44) * 6); // log2(64) = 6
  } else if (mode === "uuid") {
    bits = 122; // UUID v4 has 122 random bits
  } else if (mode === "passphrase") {
    const wordCount = options.wordCount || 5;
    bits = Math.round(wordCount * Math.log2(EFF_SHORT_WORDLIST.length));
  }

  if (bits < 40) return { bits, label: "Weak", color: "#E07A6D" };
  if (bits < 60) return { bits, label: "Fair", color: "#D97706" };
  if (bits < 80) return { bits, label: "Strong", color: "#8FA98C" };
  if (bits < 128) return { bits, label: "Very Strong", color: "#2D6A42" };
  return { bits, label: "Extreme", color: "#6366F1" };
}

// ─── Unified Generator Interface ────────────────────────────────
/**
 * Generate a secret based on mode and options.
 * @param {string} mode - "password" | "apikey" | "hex" | "base64" | "uuid" | "passphrase"
 * @param {object} options - Mode-specific options
 * @returns {string}
 */
export function generateSecret(mode, options = {}) {
  switch (mode) {
    case "password":
      return generatePassword(options);
    case "apikey":
      return generateApiKey(options);
    case "hex":
      return generateHexToken(options.length);
    case "base64":
      return generateBase64Secret(options.length);
    case "uuid":
      return generateUUID();
    case "passphrase":
      return generatePassphrase(options);
    default:
      return generatePassword(options);
  }
}

/**
 * Evaluates password strength for user inputs.
 * @param {string} password
 * @returns {{ score: number, label: string, color: string, percent: number }}
 */
export function checkPasswordStrength(password = "") {
  if (!password) return { score: 0, label: "Empty", color: "#666", percent: 0 };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: "Weak", color: "#E07A6D", percent: 25 };
  if (score === 2) return { score, label: "Fair", color: "#D97706", percent: 50 };
  if (score === 3 || score === 4) return { score, label: "Strong", color: "#8FA98C", percent: 75 };
  return { score, label: "Bulletproof", color: "#3ECF8E", percent: 100 };
}

