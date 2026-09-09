// All encryption happens here, entirely client-side. Supabase only ever
// receives the output of encryptJSON() — never plaintext, never the key.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK_SIZE = 0x8000; // 32KB safe chunk
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function unb64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function newSalt() {
  return b64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function deriveKey(password, saltB64) {
  const salt = unb64(saltB64);
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyRaw(key) {
  const exported = await crypto.subtle.exportKey("raw", key);
  return b64(exported);
}

export async function importKeyRaw(rawB64) {
  const buf = unb64(rawB64);
  return crypto.subtle.importKey("raw", buf, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({ iv: b64(iv), ct: b64(ct) });
}

export async function decryptJSON(key, blobString) {
  const payload = JSON.parse(blobString);
  const iv = new Uint8Array(unb64(payload.iv));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, unb64(payload.ct));
  return JSON.parse(dec.decode(pt));
}

export function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s.`)), ms)
    ),
  ]);
}

export async function hashText(text) {
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
